/** The fork's install identity. Technical OpenCode package and API names stay compatible. */
export function desktopBrand(raw: string | undefined) {
  const channel = raw === "prod" || raw === "latest" ? "prod" : raw === "beta" ? "beta" : "dev"
  const suffix = channel === "prod" ? "" : `-${channel}`

  return {
    channel,
    name: `Sky Agent${channel === "prod" ? "" : channel === "beta" ? " Beta" : " Dev"}`,
    id: `io.github.y0y0.squareagent${channel === "prod" ? "" : `.${channel}`}`,
    packageName: `square-agent${suffix}`,
    protocol: `square-agent${suffix}`,
    // Below Windows' ephemeral range and distinct from OpenCode's managed-service ports.
    port: channel === "prod" ? 27421 : channel === "beta" ? 27422 : 27423,
  } as const
}
