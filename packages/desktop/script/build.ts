#!/usr/bin/env bun
import { $ } from "bun"
import { exists } from "node:fs/promises"
import path from "node:path"
import { copyBuiltCliToResources, getCurrentCli, resolveChannel } from "./utils"
import { verifyBundles } from "./verify-bundles"

// Prepares resources/ (icons, metainfo, the bundled CLI) for OPENCODE_CHANNEL and builds the app into out/.
// Every channel requires a locally built CLI. Never silently ship a downloaded official binary.
const dir = path.resolve(import.meta.dir, "..")

const cli = path.resolve(dir, "../cli/dist")

const channel = resolveChannel()

process.chdir(dir)

await $`bun ./script/copy-icons.ts ${channel}`

await $`bun ./script/copy-metainfo.ts ${channel}`

const built = await exists(path.join(cli, getCurrentCli().package.replace("@opencode/", "")))

if (!built)
  throw new Error(`Square Agent requires the locally built ${getCurrentCli().target} CLI in ${cli}; build it first`)

await copyBuiltCliToResources(cli)

await $`bun run electron-vite build`

await verifyBundles(path.join(dir, "out"))
