import { afterAll, afterEach, expect, test } from "bun:test"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { configureServiceProfile } from "./profile"

const env = { ...process.env }
const root = mkdtempSync(path.join(tmpdir(), "square-agent-profile-"))
const temporaryRoots = new Set<string>()

afterEach(() => {
  Object.keys(process.env).forEach((key) => {
    if (!(key in env)) delete process.env[key]
  })
  Object.assign(process.env, env)
})

afterAll(() => {
  temporaryRoots.forEach((dir) => rmSync(dir, { recursive: true, force: true }))
  rmSync(root, { recursive: true, force: true })
})

test("isolates child service storage, rejects upstream overrides and never migrates existing data", () => {
  const official = path.join(root, "official.json")
  writeFileSync(official, "existing official data")
  process.env.OPENCODE_DB = official
  process.env.OPENCODE_CONFIG = official
  process.env.OPENCODE_CONFIG_CONTENT = "{}"
  process.env.OPENCODE_TEST_HOME = root
  delete process.env.SQUARE_AGENT_TMPDIR

  for (const [channel, port] of [
    ["prod", 27421],
    ["beta", 27422],
    ["dev", 27423],
  ] as const) {
    const userData = path.join(root, "a-long-home-directory-that-must-not-overflow-chromium-socket-paths", channel)
    configureServiceProfile(userData, port)
    const temporary = process.env.TMPDIR!
    temporaryRoots.add(temporary)

    if (process.platform === "linux") {
      const socket = path.join(temporary, "scoped_dirABCDEF", "SingletonSocket")
      expect(Buffer.byteLength(socket)).toBeLessThan(108)
      mkdirSync(path.dirname(socket), { recursive: true })
      const listener = Bun.listen({ unix: socket, socket: { data() {} } })
      listener.stop(true)
      expect(statSync(temporary).mode & 0o777).toBe(0o700)
      expect(temporary).toStartWith("/tmp/square-agent-")
      // System tmp cleanup must not make a retained directory public when it is recreated.
      rmSync(temporary, { recursive: true })
    }

    configureServiceProfile(userData, port)
    expect(process.env.TMPDIR).toBe(temporary)
    if (process.platform === "linux") expect(statSync(temporary).mode & 0o777).toBe(0o700)

    // Resolve the actual child process's module-load-time roots, not another copy of the path formula.
    const child = Bun.spawnSync(
      [
        process.execPath,
        "-e",
        'import { roots } from "../../../../util/src/global-roots.ts"; console.log(JSON.stringify(roots("opencode")))',
      ],
      { cwd: import.meta.dir, env: process.env },
    )

    expect(child.exitCode).toBe(0)
    const dirs = JSON.parse(child.stdout.toString())
    expect(dirs).toEqual({
      data: path.join(userData, "service", "data", "opencode"),
      config: path.join(userData, "service", "config", "opencode"),
      cache: path.join(userData, "service", "cache", "opencode"),
      state: path.join(userData, "service", "state", "opencode"),
      tmp: path.join(temporary, "opencode"),
    })
    expect(existsSync(process.env.XDG_STATE_HOME!)).toBe(true)
    expect(process.env.OPENCODE_CONFIG_DIR).toBe(dirs.config)
    expect(process.env.OPENCODE_DISABLE_AUTOUPDATE).toBe("true")
    expect(process.env.SQUARE_AGENT_SERVICE).toBe("1")
    expect(process.env.SQUARE_AGENT_SERVICE_PORT).toBe(String(port))
    expect(process.env.OPENCODE_DB).toBeUndefined()
    expect(process.env.OPENCODE_CONFIG).toBeUndefined()
    expect(process.env.OPENCODE_CONFIG_CONTENT).toBeUndefined()
    expect(process.env.OPENCODE_TEST_HOME).toBeUndefined()
  }

  expect(readFileSync(official, "utf8")).toBe("existing official data")
})
