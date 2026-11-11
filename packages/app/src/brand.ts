export const IS_SQUARE_AGENT = import.meta.env.VITE_SQUARE_AGENT === "1"

export const PRODUCT_NAME = IS_SQUARE_AGENT ? "Sky Agent" : "OpenCode"

export const PRODUCT_LOGO = new URL("./assets/square-agent-display.png", import.meta.url).href

// Only product copy is rebranded. Provider names, server diagnostics, URLs and legal attribution stay upstream.
const productKeys = new Set([
  "voice.assistant",
  "dialog.provider.description",
  "provider.connect.apiKey.description",
  "settings.about.description",
  "settings.about.notices.description",
  "settings.general.row.language.description",
  "settings.general.row.colorScheme.description",
  "settings.general.row.theme.description",
  "project.settings.name.description",
  "project.settings.extensions.empty.mcps.description",
  "project.settings.extensions.empty.plugins.description",
  "project.settings.extensions.empty.skills.description",
  "settings.workspaces.empty.description",
  "desktop.menu.app",
  "desktop.menu.ariaLabel",
  "desktop.recovery.loadFailed",
  "desktop.recovery.terminated",
  "desktop.recovery.unresponsive",
])

export function productMessage(key: string, template: string) {
  return IS_SQUARE_AGENT && productKeys.has(key) ? template.replaceAll("OpenCode", PRODUCT_NAME) : template
}
