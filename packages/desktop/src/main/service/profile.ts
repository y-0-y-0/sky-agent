import { mkdirSync, mkdtempSync } from "node:fs"
import path from "node:path"

/** Apply before service discovery and again after importing the login shell environment. */
export function configureServiceProfile(userData: string, port: number) {
  const root = path.join(userData, "service")
  // Chromium places its singleton socket in TMPDIR; a long profile exceeds Linux's 108-byte Unix socket limit.
  // mkdtemp creates a private 0700 directory. Retain it across shell imports and inherited-environment relaunches.
  const temporary =
    process.platform === "linux"
      ? (process.env.SQUARE_AGENT_TMPDIR ?? mkdtempSync("/tmp/square-agent-"))
      : path.join(root, "tmp")
  const dirs = {
    XDG_DATA_HOME: path.join(root, "data"),
    XDG_CONFIG_HOME: path.join(root, "config"),
    XDG_CACHE_HOME: path.join(root, "cache"),
    XDG_STATE_HOME: path.join(root, "state"),
    TMPDIR: temporary,
    TMP: temporary,
    TEMP: temporary,
  }

  Object.values(dirs).forEach((dir) => mkdirSync(dir, { recursive: true, mode: 0o700 }))
  Object.assign(process.env, dirs, {
    OPENCODE_CONFIG_DIR: path.join(dirs.XDG_CONFIG_HOME, "opencode"),
    OPENCODE_DISABLE_AUTOUPDATE: "true",
    SQUARE_AGENT_TMPDIR: temporary,
    SQUARE_AGENT_SERVICE: "1",
    SQUARE_AGENT_SERVICE_PORT: String(port),
  })

  // Explicit upstream overrides could bypass the isolated XDG roots. Do not migrate their contents.
  for (const key of ["OPENCODE_DB", "OPENCODE_CONFIG", "OPENCODE_CONFIG_CONTENT", "OPENCODE_TEST_HOME"])
    delete process.env[key]
}
