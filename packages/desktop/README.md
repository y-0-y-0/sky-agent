# Sky Agent Desktop

An independent Electron desktop fork of OpenCode 2.2.7, based on commit `8656f3048d03cc3e8050b3533db9495f52e50677`. Not affiliated with or endorsed by OpenCode or Anomaly Innovations, Inc. The upstream MIT license, copyright, credits and third-party notices are retained; packaging includes `LICENSE-OpenCode.txt`. Name/trademark availability is unverified.

## Status and compatibility

Local validation build: the source CLI, desktop bundles, Linux deb and AppImage have been built in the orb. The packaged Linux application has been exercised under Xvfb with isolated disposable data; this is not a system installation/uninstallation test. Bun 1.4.4, dependencies, Electron 44.9.1, electron-builder 26.15.7, ImageMagick and Xvfb are installed with approval. No Windows runner is connected, and no Windows installer has been built or tested. Windows signing is not configured; any installer built using the commands below is unsigned. macOS is outside this fork's supported/verified scope; no Sky Agent ICNS is generated.

The desktop-only Vite define `VITE_SQUARE_AGENT=1` enables the fork's visible branding. Other monorepo web consumers keep OpenCode branding. Provider names, model protocols, internal package names, schemas and project filenames remain compatible. Desktop GUI plugins see `ctx.app.name = "square-agent"` in both main and renderer; CLI/server identifiers stay upstream. Third-party plugins that restrict themselves to the official app name need compatibility testing. The first-launch logo drawing becomes a fade; the OpenCode-letter-specific home/About logo animations and home logo Easter egg are replaced with the supplied static image. Coding, sessions, providers and diff behavior are not intentionally changed. Local session storage, a shell command and diff display were exercised; model generation and provider authentication were not.

Sky Agent is the new visible name of the existing Square Agent fork. The technical identities in the table below, all data paths, provider credentials and update policy remain unchanged; no data migration is performed. Windows shortcuts display Sky Agent (with the channel suffix), while their executable/app ID stays unchanged. Linux packages keep their package and launcher identities but install under `/opt/Sky Agent` instead of `/opt/Square Agent`, because electron-builder derives that directory from the visible product name. Native window icons load from the packaged `app.asar/resources/icons`, not an absent external icon directory.

| Channel | Application ID | Executable/package/protocol | Service port |
| --- | --- | --- | --- |
| `prod` / `latest` | `io.github.y0y0.squareagent` | `square-agent` | 27421 |
| `beta` | `io.github.y0y0.squareagent.beta` | `square-agent-beta` | 27422 |
| `dev` / `local` / unset | `io.github.y0y0.squareagent.dev` | `square-agent-dev` | 27423 |

Unpackaged development always uses the dev application identity. Electron user data is `<appData>/<application ID>` (`%APPDATA%` on Windows; XDG config on Linux). The original app-data root is retained in `SQUARE_AGENT_APP_DATA` for inherited-environment relaunches. The managed service receives private XDG data/config/cache/state roots under `<userData>/service/`; existing technical `opencode` subdirectories remain within those roots. Windows temporary files also stay there. On Linux, a private 0700 `/tmp/square-agent-*` directory avoids Chromium's Unix socket path limit; `SQUARE_AGENT_TMPDIR` retains it across shell imports and inherited relaunches. It is not deleted at desktop exit because the detached service may still use it; normal system temporary-file cleanup applies. The profile is applied before discovery and again after login-shell imports. `SQUARE_AGENT_SERVICE=1` makes the fork CLI use `service.json` regardless of compiled channel; `SQUARE_AGENT_SERVICE_PORT` also keeps CLI-managed pairing restarts on the fork port. Without these variables, CLI behavior stays upstream. The old local filename override is unnecessary in the private profile. Inherited explicit database/global-config overrides are ignored to avoid accidentally modifying the official profile. No data is migrated or deleted. Consequently, global credentials, sessions and preferences start fresh and must be configured separately.

**Still shared:** project-local `opencode.json`, `.opencode/`, `.claude/`, repository content, shell/provider environment variables, explicitly connected remote servers and their data, and external account entitlements. Tools and terminals can edit the same project files. Service bindings are now explicitly loopback, including isolated dev mode, rather than exposing that mode on all interfaces.

**WSL exception:** the retained WSL integration resolves the distro's installed `opencode` and uses its normal state/data/config profile. Windows-process isolation does not isolate that distro. Do not use WSL integration expecting separation from an existing WSL OpenCode profile; no WSL behavior has been exercised here.

Only the fork protocol is registered; `opencode://` remains owned by OpenCode. Incoming `square-agent://` (and channel variants) normalize internally to the existing renderer link format. **Provider-side OpenCode Console return links still use `opencode://` and may open official OpenCode or fail if absent.** This requires provider-side coordination and is not solved here. Other OAuth/device flows retain their original destinations but have not been tested.

## Updates, diagnostics and external services

No feed is configured and the updater plugin is disabled for Sky Agent. CLI automatic updates are disabled in the private service environment. Packaging always requires a locally built CLI, never silently downloading a published official binary. Update manually only from a trusted fork build.

The renderer Sentry DSN is explicitly empty, so its Sentry initializer does not upload. Electron's crash reporter retains `uploadToServer: false`; diagnostics/log exports stay local unless a user shares them. This is **not an offline or telemetry-free claim**: the CLI retains optional OTLP export to `OTEL_EXPORTER_OTLP_ENDPOINT` with configured headers, imported environment and project plugins remain active, and external models/authentication still communicate with their configured providers. Defaults retained include the catalog at `https://models.opencode.ai`, OpenCode Zen/Go/Console services, OpenAI login at `https://auth.openai.com` and Codex at `https://chatgpt.com/backend-api/codex`. About contributor counts query `https://api.github.com/repos/anomalyco/opencode/contributors`; upstream documentation/community links still open their real sites. Plugins and custom providers may add destinations; the list is not exhaustive.

## Build

Install with `bun install --frozen-lockfile` from the repository root after approval. ImageMagick's `magick` must be installed separately. Platform-native build tools and electron-builder helpers may require further downloads/approval. The Linux commands below have been executed; Windows commands remain a recipe, not execution evidence. No signing secrets are supplied.

Build the CLI from this checkout first. Desktop uses baseline x64 CLI packages; the CLI target name includes `-baseline`, whereas the desktop target does not. CLI builds delete their own target `dist` directory. Desktop packing deletes `packages/desktop/dist` and root `dist/desktop`; use disposable build trees and never place the Windows prepackaged input there for the second stage.

```bash
# Repository root, Linux x64 example; requires installed dependencies and approved build/download effects.
OPENCODE_CHANNEL=latest OPENCODE_VERSION=2.2.7 OPENCODE_TARGET=linux-x64-baseline \
  bun run --cwd packages/cli script/build.ts --skip-install
OPENCODE_CHANNEL=prod OPENCODE_VERSION=2.2.7 OPENCODE_TARGET=linux-x64 \
  bun run --cwd packages/desktop build
OPENCODE_CHANNEL=prod OPENCODE_VERSION=2.2.7 OPENCODE_TARGET=linux-x64 \
  bun run --cwd packages/desktop pack
```

x64 output: `dist/desktop/sky-agent-linux-amd64.deb` and `dist/desktop/sky-agent-linux-x86_64.AppImage`; electron-builder expands the architecture differently for each format. ARM64 uses `linux-arm64` for both build stages and has not been built here. Inspect with `dpkg-deb --info` / `--contents`, and `AppImage --appimage-extract` in a disposable directory before installing.

Windows x64, from a Windows host with Bun and the required native tooling, in PowerShell at the repository root:

```powershell
$env:OPENCODE_CHANNEL = 'latest'
$env:OPENCODE_VERSION = '2.2.7'
$env:OPENCODE_TARGET = 'windows-x64-baseline'
bun run --cwd packages/cli script/build.ts --skip-install
$env:OPENCODE_CHANNEL = 'prod'
$env:OPENCODE_TARGET = 'windows-x64'
bun run --cwd packages/desktop build
bun run --cwd packages/desktop pack
# Use a fresh staging directory outside either directory erased by pack.
$stage = Join-Path $env:TEMP ('square-agent-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $stage | Out-Null
Copy-Item -Recurse dist/desktop/app (Join-Path $stage 'app')
$env:OPENCODE_DESKTOP_APP = Join-Path $stage 'app'
bun run --cwd packages/desktop pack
Remove-Item Env:OPENCODE_DESKTOP_APP
```

Output: `dist/desktop/sky-agent-win-x64.exe` (NSIS, unsigned). For ARM64 use `windows-arm64` in both stages. Packaging retains native CLI architecture, version-sidecar and node-pty checks; `OPENCODE_TARGET` must agree with electron-builder's architecture. The CLI stays outside `app.asar`.

`bun run --cwd packages/desktop dev` uses CLI source and the private dev profile. Do not use `--download-server` for a fork validation: the upstream opt-in development command still downloads an official CLI.

## Validation and remaining acceptance

Before the Sky Agent rename, executed: root `bun run check` (lint and 34 typecheck tasks), desktop `bun typecheck` and `bun run typecheck:tsc`, desktop tests (578 pass, 4 existing skips), CLI service tests (30 pass), app unit/browser suites (2613/355 pass), and GUI plugin tests (1145 pass, 1 existing skip). No test failures remain in those runs. The 3.8 GiB/no-swap orb required temporary Linux memory overcommit for the pinned oxlint allocator and `GOMEMLIMIT=1600MiB GOGC=40` for the official desktop TypeScript compiler; the original overcommit setting was restored. No lint rules or compiler checks were disabled.

Those earlier runtime checks used the packaged Linux app and its locally built CLI, not a browser-only replica. Observed: Square Agent window title and WM_CLASS, supplied logo, light/dark About disclaimer and credits, accessible third-party notices, disabled update check, private service at loopback port 27421, a stored session, successful harmless shell output, and the actual two-line README change in the review pane. Screenshots and a moving-pointer menu/About recording were inspected. Session creation and the harmless command were initiated through the local public service API; session opening and review were exercised through the UI. This does not test model generation or provider authentication.

Those earlier deb and AppImage were extracted and inspected: both contain the compiled main bundle, the fork logo, the same source-built x86-64 CLI outside ASAR, fork-only launcher/protocol metadata, preserved upstream MIT/Electron/Chromium licenses and no `app-update.yml`. The deb install/remove scripts target `square-agent` paths. That AppImage was launched with `--appimage-extract-and-run --no-sandbox --disable-gpu` under Xvfb; it restored the existing dark preference, identical session ID, shell result and review after process restart. This does not test FUSE mounting, normal desktop sandbox/GPU operation, or the native in-app relaunch path.

The session/restart checks above used the previous artwork. After the 2026-11-11 mascot replacement, the desktop and Linux deb/AppImage were rebuilt. The refreshed AppImage's new-session and About screens were inspected in light/dark themes, without the previous black square or background streaks. Pixel checks verified transparency in all 14 generated PNG outputs and all seven ICO frames; the renderer PNG matches the native 512px PNG. Both refreshed packages contain that exact renderer asset and identical ASARs; all 11 deb-installed icon sizes match the transparent generated PNGs. The full desktop suite still passes (578 pass, 4 existing skips), desktop type checking passes, and targeted lint has warnings but no errors. Native Windows icon rendering remains unverified.

After the Sky Agent rename, the desktop and Linux deb/AppImage were rebuilt again. Their launchers/AppStream display Sky Agent while retaining the package/executable/protocol and WM_CLASS identities. Both packages contain the exact current PNG/ICO resources and compiled main bundle; installed hicolor icons match all 11 generated sizes. The actual AppImage window reports title Sky Agent and WM_CLASS `io.github.y0y0.squareagent`; its 512px X11 window icon has the exact generated alpha and opaque RGB pixels. New-session and About screens were inspected in light/dark at DPR 2, with no old visible name or rectangular logo background. Full desktop tests pass (578, 4 existing skips), app unit/browser suites pass (2627/355), and focused i18n tests pass in both web and fork modes (35 each). Root `bun run check` passes all 34 typecheck tasks with lint warnings but no errors; package checks, official desktop TypeScript and formatting pass. The independent source review found no blocker; its test-expectation concern was corrected. Native system menu/shortcut integration was not exercised under bare Xvfb, and no Windows build or installer execution is claimed.

Still required on disposable Windows/Linux profiles: actual install/uninstall alongside official OpenCode, taskbar/shortcut associations, OS deep-link registration without stealing `opencode://`, provider authentication and generation, WSL behavior, native in-app relaunch and pairing changes, reduced-motion/error states and Windows installer UI. Source isolation tests preserve an official-data sentinel, but do not prove coexistence with an installed official desktop. Verify all required notices and native dependencies in each target's final package. ARM64 and Windows remain unbuilt here.

Upstream release/deployment workflows are retained unchanged, with their existing upstream-repository gates. Do not run upstream publication workflows for this fork. The fork-specific workflow below publishes only GitHub test prereleases, not deployments or official OpenCode updates.

## Automatic desktop prereleases

`.github/workflows/sky-agent-desktop.yml` runs on every branch push (not tag pushes) and on manual dispatch. A push containing several commits builds only its head SHA. Separate Windows 2025 and Ubuntu 24.04 x64 runners use the pinned Bun version, Node 24 and `bun install --frozen-lockfile`, then compile the fork CLI from that same checkout. No official CLI download substitutes for this build. ImageMagick generates the existing Sky Agent icons; Linux uses the compatible ImageMagick 6 `convert` entry point when `magick` is absent.

The workflow builds a real unsigned Windows NSIS installer, Linux deb and AppImage. It extracts every final package and compares its embedded CLI SHA-256 and version with the locally compiled CLI, checks the desktop executable architecture and Linux launcher name, and rejects missing, empty, extra or wrong-platform outputs. The NSIS launcher itself is x86; its verified application and CLI payload are x64. Distributed filenames use the public `sky-agent` prefix (`sky-agent-win-x64.exe`, `sky-agent-linux-amd64.deb`, `sky-agent-linux-x86_64.AppImage`); the deb package name, installed executable name, application IDs, protocols and data paths keep their `square-agent` technical identities.

Find downloadable ZIP artifacts under **Actions → Sky Agent desktop → an execution → Artifacts**, named `sky-agent-{windows,linux}-x64-<SHA>`. Retention is **1 day**, the minimum supported Actions retention and within repository maximums; release assets remain available until their release is deleted. The artifact manifest records SHA, run ID, build attempt, version, CLI hash and package sizes/hashes. Versions use `<root version>-sky.<run number>`, stable across attempts of the same run.

After both builds succeed, publication downloads only this run's exact-SHA artifacts and validates all three files again. A partial rerun may reuse the other platform's successful artifact only with the same SHA/run ID/version and a build attempt no later than the publication attempt. Missing, expired or mismatched artifacts fail explicitly: choose **Re-run all jobs**. Rebuilt platform artifacts replace only their same-run, same-SHA artifact; existing releases and tags are never overwritten.

Each publication attempt creates `sky-agent-run-<run ID>-attempt-<attempt>` targeting the built SHA. Assets upload to a new **draft prerelease**; names, sizes and GitHub's SHA-256 asset digests must match before publication. A failure leaves the draft recoverable and reports its URL. Inspect that draft in **Releases**; rerun the failed publication job to use a new attempt/tag rather than editing or reusing the old one. A network error after GitHub accepts the final publish request can leave a complete published release despite a failed job; inspect the reported URL before taking action. These prereleases explicitly use `make_latest=false` and do not replace stable Latest.

Manual launch: **Actions → Sky Agent desktop → Run workflow**, choose the source branch, then **Run workflow**. The workflow must exist on the default branch for this button. Find the three standalone installers under **Releases → Sky Agent — run …**, also linked from the publication job summary. The notes identify SHA/ref/run/attempt, platform build attempts and unsigned status. Windows may show a SmartScreen/unknown-publisher warning. No signing secret, certificate, update feed or deployment is configured.

Build jobs have `contents: read` only; publication alone has `contents: write`, checks out only the release scripts, and never installs or executes application dependencies. If Actions is disabled, enable it in the repository's **Actions** tab. If organization/repository policy or tag rules reject `GITHUB_TOKEN` publication, an administrator must allow this workflow's explicit contents-write permission and creation of its `sky-agent-run-*` tags/releases; do not bypass protections or add an unreviewed token. Local artifact-validation tests run with `python3 -m unittest discover -s .github/sky-agent -v` (Linux, Python 3.11+ and dpkg-deb).

## Startup benchmark

`perf/startup.bench.ts` times a launch with [strobe](https://github.com/anomalyco/strobe), from process spawn to what a
person waits for, in pairs of launches of two builds with an interval per case. Every launch runs in a private home
(its own `%APPDATA%`, XDG folders, database, config and service registration, the developer's `OPENCODE_*`, `OTEL_*`
and `SENTRY_*` environment removed), so it never touches the developer's app, profile or live service.

| Case                            | Launch                                                                              | Ends on      |
| ------------------------------- | ----------------------------------------------------------------------------------- | ------------ |
| launch to Home                  | Profile kept from earlier launches; the service already runs, from the bundled CLI. | Home         |
| launch to a restored tab        | Profile kept; the first launch's onboarding draft is restored.                      | The composer |
| launch to Home, service stopped | Profile kept; the desktop spawns its service.                                       | Home         |
| first launch                    | No profile or GPU shader caches: right after an install, onboarding opens a draft.  | The composer |
| dev start to Home               | `bun dev:desktop` with Vite's caches and `out` deleted.                             | Home         |

```bash
# A returning user's launches of two packaged builds (pack each with OPENCODE_CHANNEL=beta or prod), or two installed
# channels.
strobe bench perf/startup.bench.ts --target desktop --base exe:<old>/OpenCode.exe --head exe:<new>/OpenCode.exe
strobe bench perf/startup.bench.ts --target desktop --base app:opencode --head app:opencode-beta

# The first launch after an install.
strobe bench perf/startup.bench.ts --target install --base app:opencode --head app:opencode-beta

# The dev loop's cold start, dev against this checkout.
strobe bench perf/startup.bench.ts --target dev --base origin/dev --head .
```

strobe runs on Windows, macOS and Linux. Windows measures the most; on macOS a packaged launch needs a build whose bundle
id this account has never run (`packages/app/perf/README.md` lists what each OS gives).

Besides `launch.ready`, each launch reports its milestones as `launch.<name>` in ms since spawn: the main process's own
marks from its log (`entry`, `electron`, `window`, `served`, `bundle`, `logging`, `storage`, `init`, `layers`,
`visible`, `service.starting`, `service.ready`; `src/main/lifecycle/marks.ts`), or each step of the dev command's
output. `launch.painted` and `launch.settled` are when the window's pixels first and last changed, `cpu.work` is the CPU
every process used until ready, and `launch.node.*` is Node's bootstrap timing in builds that accept `--inspect`. The
first launch of each build is discarded, because a new binary pays the antivirus scan. The packaged
returning-user cases keep the GPU shader caches their build compiled in earlier launches, as a person's machine has
them; `first launch` starts each launch without them. `--why always` adds a profiled
launch per build: the main process and the renderer, both from their first statement.

The retained upstream benchmark examples above name upstream installations; substitute actual Sky Agent executables when comparing the fork. The fork registers only its own channel-specific protocol, including from the benchmark; disable protocol registration in unpackaged tests with `OPENCODE_DESKTOP_DISABLE_PROTOCOL_REGISTRATION=1`. Automatic updates are disabled independently of the benchmark's proxy settings. Benchmarking has not been run here because strobe is absent.
