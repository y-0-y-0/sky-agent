# Sky Agent

<img src="packages/app/src/assets/square-agent-display.png" alt="Sky Agent" width="128" />

Sky Agent is an independent desktop fork of [OpenCode](https://github.com/anomalyco/opencode), based on commit `8656f3048d03cc3e8050b3533db9495f52e50677` (2.2.7). It is not affiliated with or endorsed by OpenCode or Anomaly Innovations, Inc. The MIT license and upstream copyright remain applicable. Availability of the name as a trademark has not been verified.

**Local Linux validation build, not a verified release:** Sky Agent Linux x64 deb/AppImage packages have been built and inspected. The packaged Electron app's light/dark branding, legal notices and actual native window icon have been checked with an isolated profile; earlier fork validation also exercised a session, a harmless command and a repository diff. Windows NSIS packaging is prepared but has not been built or tested. See [desktop build instructions and compatibility audit](packages/desktop/README.md). No Sky Agent update server is configured; automatic binary updates are disabled. No existing OpenCode data is migrated.

The visible name changed from Square Agent to Sky Agent. Existing `square-agent` package/executable names, application IDs, data paths, protocols and plugin identities stay unchanged to preserve sessions, settings and provider connections. Linux's install directory follows the visible name (`/opt/Sky Agent`); user data does not move.

The new orange furry mascot has been cut out from the supplied image, removing its background and horizontal streaks. The prepared canonical PNG, renderer image and generated Windows/Linux icons retain transparency; no black canvas is added. Internal OpenCode APIs and provider names remain unchanged for compatibility.

## Desktop downloads and automatic builds

[Sky Agent desktop Actions](https://github.com/y-0-y-0/sky-agent/actions/workflows/sky-agent-desktop.yml) builds each branch push and supports **Run workflow** for a selected branch. Successful Windows/Linux x64 builds publish a new unsigned [test prerelease](https://github.com/y-0-y-0/sky-agent/releases) with a Windows NSIS `.exe`, Linux `.deb` and `.AppImage`; it never replaces stable Latest. The same files are Actions artifacts retained for **1 day**. Distributed files use the public `sky-agent` prefix (`sky-agent-win-x64.exe`, `sky-agent-linux-amd64.deb`, `sky-agent-linux-x86_64.AppImage`); the installed package, executable, application IDs, data paths and protocols keep their `square-agent` technical identities to preserve sessions, settings and connections. Windows may display an unknown-publisher/SmartScreen warning. See [build, publication and rerun details](packages/desktop/README.md#automatic-desktop-prereleases). Packaging validation is not a native installation or provider-authentication acceptance test.

## Upstream OpenCode documentation

The following is retained upstream documentation. Its installation commands install **OpenCode**, not Sky Agent.

<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset=".github/assets/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset=".github/assets/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src=".github/assets/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">The open source AI coding agent.</p>
<p align="center">
  <a href="https://opencode.ai/discord"><img alt="Discord" src="https://img.shields.io/discord/1391832426048651334?style=flat-square&label=discord" /></a>
  <a href="https://www.npmjs.com/package/@opencode/cli"><img alt="npm" src="https://img.shields.io/npm/v/@opencode/cli?style=flat-square" /></a>
  <a href="https://github.com/anomalyco/opencode/actions/workflows/release.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/anomalyco/opencode/release.yml?style=flat-square&branch=dev" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.zht.md">繁體中文</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.de.md">Deutsch</a> |
  <a href="README.es.md">Español</a> |
  <a href="README.fr.md">Français</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.pl.md">Polski</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.no.md">Norsk</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.th.md">ไทย</a> |
  <a href="README.tr.md">Türkçe</a> |
  <a href="README.uk.md">Українська</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.gr.md">Ελληνικά</a> |
  <a href="README.vi.md">Tiếng Việt</a>
</p>

[![OpenCode Terminal UI](services/site/public/v1/docs/assets/lander/screenshot.png)](https://opencode.ai)

---

### Installation

```bash
# YOLO
curl -fsSL https://opencode.ai/v2/install | bash

# Package managers
npm i -g @opencode/cli@latest      # or bun/pnpm/yarn
brew install anomalyco/tap/opencode-v2 # macOS and Linux (recommended, always up to date)
brew install opencode              # macOS and Linux (official brew formula, updated less)
sudo pacman -S opencode            # Arch Linux (Stable)
paru -S opencode-beta              # Arch Linux (Latest from AUR)
mise use -g opencode               # Any OS
nix run github:anomalyco/opencode  # Nix
```

> [!TIP]
> Remove versions older than 0.1.x before installing.

### Desktop App (BETA)

OpenCode is also available as a desktop application. Download it from [opencode.ai/download](https://opencode.ai/download).

| Platform              | Download                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `opencode-desktop-mac-x64.dmg`     |
| Windows               | `opencode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm`, or `.AppImage`     |

```bash
# macOS (Homebrew)
brew install --cask opencode-desktop
```

#### Installation Directory

The install script installs OpenCode to `$HOME/.opencode/bin`.

### Agents

OpenCode includes two built-in agents you can switch between with the `Tab` key.

- **build** - Default, full-access agent for development work
- **plan** - Read-only agent for analysis and code exploration
  - Denies file edits by default
  - Asks permission before running bash commands
  - Ideal for exploring unfamiliar codebases or planning changes

Also included is a **general** subagent for complex searches and multistep tasks.
This is used internally and can be invoked using `@general` in messages.

Learn more about [agents](https://opencode.ai/docs/agents).

### Documentation

For more info on how to configure OpenCode, [**head over to our docs**](https://opencode.ai/docs).

### Contributing

If you're interested in contributing to OpenCode, please read our [contributing docs](./CONTRIBUTING.md) before submitting a pull request.

### Building on OpenCode

If you are working on a project that's related to OpenCode and is using "opencode" as part of its name, for example "opencode-dashboard" or "opencode-mobile", please add a note to your README to clarify that it is not built by the OpenCode team and is not affiliated with us in any way.

---

**Join our community** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
