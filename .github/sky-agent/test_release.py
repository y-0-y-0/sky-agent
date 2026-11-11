"""Exercise the artifact acceptance boundary without network access or signing tools."""

import hashlib
import io
import json
import os
from pathlib import Path
import struct
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from contextlib import redirect_stderr, redirect_stdout

import release


class ArtifactTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "artifacts"
        self.root.mkdir()
        self.env = dict(os.environ)
        self.addCleanup(self.restore_env)
        os.environ.update(GITHUB_SHA="a" * 40, GITHUB_RUN_ID="123", GITHUB_RUN_ATTEMPT="2")
        for target, names in {
            "windows-x64": ["sky-agent-win-x64.exe"],
            "linux-x64": ["sky-agent-linux-amd64.deb", "sky-agent-linux-x86_64.AppImage"],
        }.items():
            folder = self.root / f"sky-agent-{target}-{'a' * 40}"
            folder.mkdir()
            for name in names:
                file = folder / name
                if name.endswith(".exe"):
                    body = bytearray(512)
                    body[:2] = b"MZ"
                    struct.pack_into("<I", body, 60, 128)
                    body[128:132] = b"PE\0\0"
                    struct.pack_into("<H", body, 132, 0x14C)
                    body[256:272] = b"\xef\xbe\xad\xdeNullsoftInst"
                    file.write_bytes(body)
                if name.endswith(".AppImage"):
                    body = bytearray(64)
                    body[:6] = b"\x7fELF\x02\x01"
                    body[8:11] = b"AI\x02"
                    struct.pack_into("<H", body, 18, 62)
                    file.write_bytes(body)
                if name.endswith(".deb"):
                    tree = Path(self.temp.name) / "deb-input"
                    (tree / "DEBIAN").mkdir(parents=True)
                    (tree / "DEBIAN/control").write_text("Package: square-agent\nVersion: 2.2.7\nArchitecture: amd64\nMaintainer: Sky Agent\nDescription: fixture\n")
                    subprocess.run(["dpkg-deb", "--build", str(tree), str(file)], check=True, stdout=subprocess.DEVNULL)
            (folder / "manifest.json").write_text(json.dumps({
                "sha": "a" * 40, "run_id": "123", "attempt": 1,
                "target": target, "version": "2.2.7-sky.9", "cli_sha256": "b" * 64,
                "files": {n: {"size": (folder / n).stat().st_size, "sha256": hashlib.sha256((folder / n).read_bytes()).hexdigest()} for n in names},
            }))

    def restore_env(self):
        os.environ.clear()
        os.environ.update(self.env)

    def manifest(self, **changes):
        file = self.root / f"sky-agent-linux-x64-{'a' * 40}/manifest.json"
        manifest = json.loads(file.read_text())
        manifest.update(changes)
        file.write_text(json.dumps(manifest))

    def test_partial_rerun_accepts_earlier_same_commit_attempt(self):
        assets, manifests = release.verify(self.root)
        self.assertEqual(sorted(p.suffix for p in assets), [".AppImage", ".deb", ".exe"])
        self.assertEqual([m["attempt"] for m in manifests], [1, 1])

    def test_rejects_wrong_commit_run_target_version_and_attempt(self):
        for change in [{"sha": "c" * 40}, {"run_id": "456"}, {"target": "windows-x64"}, {"version": "2.2.8"}, {"attempt": 3}]:
            with self.subTest(change=change):
                file = self.root / f"sky-agent-linux-x64-{'a' * 40}/manifest.json"
                previous = file.read_text()
                self.manifest(**change)
                with self.assertRaises(ValueError):
                    release.verify(self.root)
                file.write_text(previous)

    def test_rejects_corruption_empty_missing_and_extra_files(self):
        file = self.root / f"sky-agent-windows-x64-{'a' * 40}/sky-agent-win-x64.exe"
        original = file.read_bytes()
        for body in [original + b"corruption", b"", None]:
            with self.subTest(body=body is None):
                file.unlink()
                if body is not None:
                    file.write_bytes(body)
                with self.assertRaises(ValueError):
                    release.verify(self.root)
                file.write_bytes(original)
        file.with_suffix(".extra").write_bytes(b"unexpected")
        with self.assertRaises(ValueError):
            release.verify(self.root)

    def test_missing_platform_requires_full_rerun(self):
        folder = self.root / f"sky-agent-windows-x64-{'a' * 40}"
        folder.rename(self.root / "wrong-platform")
        with self.assertRaisesRegex(ValueError, "rerun all jobs"):
            release.verify(self.root)

    def test_rejects_arm64_appimage_even_with_matching_checksum(self):
        file = self.root / f"sky-agent-linux-x64-{'a' * 40}/sky-agent-linux-x86_64.AppImage"
        body = bytearray(file.read_bytes())
        struct.pack_into("<H", body, 18, 183)
        file.write_bytes(body)
        manifest_file = file.parent / "manifest.json"
        manifest = json.loads(manifest_file.read_text())
        manifest["files"][file.name]["sha256"] = hashlib.sha256(body).hexdigest()
        manifest_file.write_text(json.dumps(manifest))
        with self.assertRaisesRegex(ValueError, "x86-64"):
            release.verify(self.root)

    def test_rejects_plain_executable_instead_of_nsis(self):
        file = self.root / f"sky-agent-windows-x64-{'a' * 40}/sky-agent-win-x64.exe"
        body = bytearray(file.read_bytes())
        body[256:272] = b"\0" * 16
        file.write_bytes(body)
        with self.assertRaisesRegex(ValueError, "NSIS"):
            release.package(file)

    def test_publication_only_exposes_complete_assets_and_preserves_failed_drafts(self):
        os.environ.update(GITHUB_REPOSITORY="fixture/sky-agent", GITHUB_REF="refs/heads/square-agent", GITHUB_STEP_SUMMARY=str(Path(self.temp.name) / "summary"))
        real_run = subprocess.run
        for fault in ["none", "upload", "digest", "missing-digest", "tag", "existing-tag", "draft-response"]:
            with self.subTest(fault=fault):
                state = {"release": None, "tag": None}
                def github(args, **kwargs):
                    if args[0] != "gh":
                        return real_run(args, **kwargs)
                    method = args[args.index("--method") + 1] if "--method" in args else "GET"
                    path = next((p for p in args if p.startswith("repos/")), "")
                    body = json.loads(kwargs["input"]) if kwargs.get("input") else None
                    code, result = 0, {}
                    if args[1:3] == ("release", "upload"):
                        files = [Path(p) for p in args[4:-2]]
                        state["release"]["assets"] = [{"name": p.name, "size": p.stat().st_size, "state": "uploaded", "digest": "sha256:" + hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]
                        if fault == "upload":
                            state["release"]["assets"].pop()
                            code = 500
                        if fault in ["digest", "missing-digest"]:
                            state["release"]["assets"][0]["digest"] = None if fault == "missing-digest" else "sha256:wrong"
                    elif method == "POST" and path.endswith("/releases"):
                        state["release"] = dict(body, id=10, html_url="https://example.invalid/draft", assets=[])
                        result = state["release"]
                        if fault == "draft-response":
                            code = 500
                    elif method == "GET" and path.endswith("/releases/10"):
                        result = state["release"]
                    elif method == "POST" and path.endswith("/git/refs"):
                        if fault == "tag":
                            code = 403
                        if code == 0:
                            state["tag"] = body["sha"]
                    elif method == "GET" and "/git/ref/tags/" in path:
                        result = {"object": {"sha": state["tag"]}}
                        code = 0 if state["tag"] or fault == "existing-tag" else 404
                    elif method == "GET" and "/releases/tags/" in path:
                        code = 404
                    elif method == "PATCH" and path.endswith("/releases/10"):
                        state["release"].update(body)
                        result = state["release"]
                    else:
                        raise AssertionError((method, path))
                    stderr = f"HTTP {code}" if code else ""
                    if code and kwargs.get("check"):
                        raise subprocess.CalledProcessError(code, args, stderr=stderr)
                    return subprocess.CompletedProcess(args, int(code != 0), stdout=json.dumps(result), stderr=stderr)

                error = io.StringIO()
                with patch.object(subprocess, "run", github), redirect_stdout(io.StringIO()), redirect_stderr(error):
                    if fault == "none":
                        release.publish(self.root)
                        self.assertFalse(state["release"]["draft"])
                        self.assertTrue(state["release"]["prerelease"])
                        self.assertEqual(state["release"]["make_latest"], "false")
                        self.assertEqual(len(state["release"]["assets"]), 3)
                        self.assertEqual(state["tag"], "a" * 40)
                        self.assertEqual(state["release"]["tag_name"], "sky-agent-run-123-attempt-2")
                    else:
                        with self.assertRaises((ValueError, subprocess.CalledProcessError)):
                            release.publish(self.root)
                        self.assertTrue(state["release"] is None or state["release"]["draft"])
                        if state["release"]:
                            self.assertIn("sky-agent-run-123-attempt-2", error.getvalue())
                            self.assertIn("before retrying", error.getvalue())


if __name__ == "__main__":
    unittest.main()
