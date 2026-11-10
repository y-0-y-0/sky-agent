/** Keep the shared renderer's OpenCode link format without claiming its OS association. */
export function normalizeDeepLink(value: string) {
  return value.replace(/^square-agent(?:-dev|-beta)?:\/\//, "opencode://")
}

export function consoleReturnWindow(value: string) {
  try {
    const url = new URL(normalizeDeepLink(value))

    if (url.protocol !== "opencode:" || url.hostname !== "console" || url.pathname !== "/authorized") return
    const id = url.searchParams.get("window")

    if (!id || id.length > 256 || /[\u0000-\u001f\u007f]/.test(id)) return

    return id
  } catch {
    return
  }
}
