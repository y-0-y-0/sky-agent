import { app } from "electron"
import { desktopBrand } from "../../brand"

type Channel = "local" | "dev" | "beta" | "prod"

const raw = import.meta.env.OPENCODE_CHANNEL

export const CHANNEL: Channel = raw === "local" || raw === "dev" || raw === "beta" || raw === "prod" ? raw : "dev"

export const VERSION = app.isPackaged ? app.getVersion() : (process.env.OPENCODE_VERSION ?? app.getVersion())

export const BRAND = desktopBrand(app.isPackaged ? CHANNEL : "dev")

// Local renderer/server mode keeps the dev application identity.
export const APP_NAME = BRAND.name

export const APP_ID = BRAND.id
