"""Validate Sky Agent packages and publish only a complete, new draft-first prerelease."""

import hashlib
import json
import os
from pathlib import Path
import struct
import subprocess
import sys
import tempfile


PACKAGES = {
    "windows-x64": ["square-agent-win-x64.exe"],
    "linux-x64": ["square-agent-linux-amd64.deb", "square-agent-linux-x86_64.AppImage"],
}


def run(*args, **kwargs):
    return subprocess.check_output(args, text=True, **kwargs).strip()


def digest(file):
    with file.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def native(file, windows=False, installer=False):
    with file.open("rb") as stream:
        header = stream.read(4096)
        if windows:
            require(header[:2] == b"MZ", f"Not a Windows executable: {file}")
            offset = struct.unpack_from("<I", header, 60)[0]
            require(header[offset:offset + 4] == b"PE\0\0", f"Invalid PE header: {file}")
            machine = struct.unpack_from("<H", header, offset + 4)[0]
            # NSIS uses an x86 launcher around the separately verified x64 application payload.
            require(machine in ([0x14C, 0x8664] if installer else [0x8664]), f"Wrong PE CPU: {file}")
            if installer:
                require(b"\xef\xbe\xad\xdeNullsoftInst" in header + stream.read(), f"Not an NSIS installer: {file}")
            return
        require(header[:5] == b"\x7fELF\x02" and header[5] == 1, f"Not a 64-bit ELF: {file}")
        require(struct.unpack_from("<H", header, 18)[0] == 62, f"Not an x86-64 ELF: {file}")


def package(file):
    require(file.is_file() and file.stat().st_size > 0, f"Missing/empty package: {file}")
    if file.suffix == ".exe":
        native(file, windows=True, installer=True)
    if file.suffix == ".AppImage":
        native(file)
        with file.open("rb") as stream:
            require(stream.read(11)[8:11] == b"AI\x02", f"Not a type-2 AppImage: {file}")
    if file.suffix == ".deb":
        require(run("dpkg-deb", "--field", str(file), "Architecture") == "amd64", f"Not an amd64 deb: {file}")


def stage(target):
    root = Path.cwd()
    output = root / "dist/desktop"
    require(sorted(p.name for p in output.iterdir()) == sorted(PACKAGES[target]), "Unexpected/missing package outputs")
    windows = target == "windows-x64"
    executable = "opencode.exe" if windows else "opencode"
    cli = root / f"packages/cli/dist/cli-{target}-baseline/bin/{executable}"
    native(cli, windows=windows)
    sha = run("git", "rev-parse", "HEAD")
    require(sha == os.environ["GITHUB_SHA"], "Checkout differs from the triggering SHA")
    for name in PACKAGES[target]:
        file = output / name
        package(file)
        with tempfile.TemporaryDirectory() as temp:
            dest = Path(temp)
            if file.suffix == ".deb":
                run("dpkg-deb", "--extract", str(file), str(dest))
            if file.suffix == ".AppImage":
                file.chmod(file.stat().st_mode | 0o111)
                run(str(file), "--appimage-extract", cwd=dest)
            if windows:
                run("7z", "x", str(file), f"-o{dest / 'installer'}", "-y")
                payloads = list((dest / "installer").rglob("app-64.7z"))
                require(len(payloads) == 1, "Expected exactly one NSIS app-64.7z payload")
                run("7z", "x", str(payloads[0]), f"-o{dest / 'app'}", "-y")
            bundled = list(dest.rglob("opencode-cli.exe" if windows else "opencode-cli"))
            require(len(bundled) == 1 and digest(bundled[0]) == digest(cli), f"Packaged CLI differs from source build: {name}")
            require(bundled[0].with_name("opencode-cli.version").read_text().strip() == os.environ["OPENCODE_VERSION"], "Wrong CLI version")
            app = bundled[0].parent.parent / ("square-agent.exe" if windows else "square-agent")
            native(app, windows=windows)
            if not windows:
                launchers = list(dest.rglob("*.desktop"))
                require(any("Name=Sky Agent\n" in p.read_text() for p in launchers), "Missing Sky Agent launcher")
    (output / "manifest.json").write_text(json.dumps({
        "sha": sha,
        "run_id": os.environ["GITHUB_RUN_ID"],
        "attempt": int(os.environ["GITHUB_RUN_ATTEMPT"]),
        "target": target,
        "version": os.environ["OPENCODE_VERSION"],
        "cli_sha256": digest(cli),
        "files": {name: {"size": (output / name).stat().st_size, "sha256": digest(output / name)} for name in PACKAGES[target]},
    }, indent=2) + "\n")
    print(f"Verified {target}: final packages contain the exact source-built x64 CLI")


def verify(directory):
    directory = Path(directory)
    sha = os.environ["GITHUB_SHA"]
    require(sorted(p.name for p in directory.iterdir()) == sorted(f"sky-agent-{t}-{sha}" for t in PACKAGES), "Missing/ambiguous artifacts; rerun all jobs")
    assets = []
    manifests = []
    for target, names in PACKAGES.items():
        folder = directory / f"sky-agent-{target}-{sha}"
        require(sorted(p.name for p in folder.iterdir()) == sorted([*names, "manifest.json"]), "Unexpected/missing artifact files; rerun all jobs")
        manifest = json.loads((folder / "manifest.json").read_text())
        require(manifest["sha"] == sha and manifest["run_id"] == os.environ["GITHUB_RUN_ID"] and manifest["target"] == target, "Artifact provenance mismatch; rerun all jobs")
        require(1 <= manifest["attempt"] <= int(os.environ["GITHUB_RUN_ATTEMPT"]), "Invalid artifact attempt; rerun all jobs")
        require(sorted(manifest["files"]) == sorted(names), "Manifest package list mismatch")
        for name in names:
            file = folder / name
            package(file)
            require(manifest["files"][name] == {"size": file.stat().st_size, "sha256": digest(file)}, f"Package checksum/size mismatch: {name}")
            assets.append(file)
        manifests.append(manifest)
    require(len({m["version"] for m in manifests}) == 1, "Platform versions differ; rerun all jobs")
    print("Verified all three packages, SHA/run provenance, sizes and SHA-256 checksums")
    return assets, manifests


def api(method, path, body=None):
    args = ["gh", "api", "--method", method, f"repos/{os.environ['GITHUB_REPOSITORY']}/{path}"]
    if body is not None:
        args += ["--input", "-"]
    return json.loads(run(*args, input=json.dumps(body) if body is not None else None))


def publish(directory):
    assets, manifests = verify(directory)
    repo = os.environ["GITHUB_REPOSITORY"]
    sha = os.environ["GITHUB_SHA"]
    run_id = os.environ["GITHUB_RUN_ID"]
    attempt = os.environ["GITHUB_RUN_ATTEMPT"]
    tag = f"sky-agent-run-{run_id}-attempt-{attempt}"
    # Query both namespaces; permission/network errors must not be treated as absence.
    for path in [f"git/ref/tags/{tag}", f"releases/tags/{tag}"]:
        result = subprocess.run(["gh", "api", f"repos/{repo}/{path}"], capture_output=True, text=True)
        require(result.returncode != 0 and "HTTP 404" in result.stderr, f"Tag/release exists or cannot be checked: {tag}\n{result.stderr}")
    notes = "\n".join([
        "Test prerelease — unsigned binaries, not a stable release.",
        f"Commit: `{sha}`", f"Reference: `{os.environ['GITHUB_REF']}`",
        f"Run: https://github.com/{repo}/actions/runs/{run_id}/attempts/{attempt}",
        f"Run ID: {run_id}; publication attempt: {attempt}.",
        "Platforms: Windows x64 (NSIS installer), Linux x64 (deb and AppImage).",
        "No code signing or signing certificate is configured. Windows may display a SmartScreen/unknown-publisher warning.",
        "Automatic application updates remain disabled; install trusted fork builds manually.",
        *[f"- {m['target']}: version `{m['version']}`, built in attempt {m['attempt']}; source CLI SHA-256 `{m['cli_sha256']}`." for m in manifests],
        "", "Package SHA-256:", *[f"- `{p.name}`: `{digest(p)}`" for p in assets],
    ])
    url = f"https://github.com/{repo}/releases"
    try:
        draft = api("POST", "releases", {"tag_name": tag, "target_commitish": sha, "name": f"Sky Agent — run {run_id}, attempt {attempt}", "body": notes, "draft": True, "prerelease": True, "make_latest": "false"})
        url = draft["html_url"]
        run("gh", "release", "upload", tag, *[str(p) for p in assets], "--repo", repo)
        release = api("GET", f"releases/{draft['id']}")
        expected = sorted((p.name, p.stat().st_size, f"sha256:{digest(p)}") for p in assets)
        actual = sorted((p["name"], p["size"], p.get("digest")) for p in release["assets"] if p["state"] == "uploaded")
        require(release["draft"] and release["target_commitish"] == sha and len(release["assets"]) == 3 and actual == expected, "Draft assets/SHA/checksums differ; refusing to publish")
        # Reserve the tag at the built SHA before publication; a collision fails without overwriting it.
        api("POST", "git/refs", {"ref": f"refs/tags/{tag}", "sha": sha})
        require(api("GET", f"git/ref/tags/{tag}")["object"]["sha"] == sha, "Tag SHA differs")
        api("PATCH", f"releases/{draft['id']}", {"draft": False, "prerelease": True, "make_latest": "false"})
        final = api("GET", f"releases/{draft['id']}")
        require(not final["draft"] and final["prerelease"] and len(final["assets"]) == 3, "Published release verification failed")
    except Exception:
        print(f"::error::Publication failed for {tag}; outcome may be unknown. Inspect the recoverable draft/release at {url} before retrying; never overwrite its tag. Rerun the publication job for a new attempt/tag.", file=sys.stderr)
        raise
    print(url)
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as summary:
        summary.write(f"### Sky Agent prerelease\n\n{url}\n\nCommit: `{sha}`. All three unsigned x64 packages verified.\n")


if __name__ == "__main__":
    {"stage": stage, "verify": verify, "publish": publish}[sys.argv[1]](sys.argv[2])
