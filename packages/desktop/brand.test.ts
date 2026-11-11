import { expect, test } from "bun:test"
import { desktopBrand } from "./brand"

// Install, protocol and service identities must remain distinct across channels and from OpenCode.
test.each([
  ["prod", "Sky Agent", "io.github.y0y0.squareagent", "square-agent", 27421],
  ["latest", "Sky Agent", "io.github.y0y0.squareagent", "square-agent", 27421],
  ["beta", "Sky Agent Beta", "io.github.y0y0.squareagent.beta", "square-agent-beta", 27422],
  ["dev", "Sky Agent Dev", "io.github.y0y0.squareagent.dev", "square-agent-dev", 27423],
  ["local", "Sky Agent Dev", "io.github.y0y0.squareagent.dev", "square-agent-dev", 27423],
  [undefined, "Sky Agent Dev", "io.github.y0y0.squareagent.dev", "square-agent-dev", 27423],
] as const)("keeps the %s install identity", (channel, name, id, packageName, port) => {
  expect(desktopBrand(channel)).toEqual({
    channel: channel === "prod" || channel === "latest" ? "prod" : channel === "beta" ? "beta" : "dev",
    name,
    id,
    packageName,
    protocol: packageName,
    port,
  })
})
