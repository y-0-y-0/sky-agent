import { describe, expect, test } from "bun:test"
import { PRODUCT_NAME, productMessage } from "@/brand"
import { DESKTOP_NATIVE_LOCALES } from "./desktop-native"
import en from "./en"
import { localizedListParts, richTemplateParts } from "./language"

describe("product translations", () => {
  const fork = process.env.VITE_SQUARE_AGENT === "1"

  test("uses the fork name only in the desktop build", () => {
    expect(PRODUCT_NAME).toBe(fork ? "Sky Agent" : "OpenCode")
  })

  test.each([
    ["voice.assistant", "Sky Agent:"],
    [
      "provider.connect.apiKey.description",
      "Enter your {{provider}} API key to connect your account and use {{provider}} models in Sky Agent.",
    ],
    ["desktop.menu.app", "Sky Agent"],
    ["desktop.menu.ariaLabel", "Sky Agent menu"],
    ["desktop.recovery.loadFailed", "Sky Agent failed to load"],
  ] as const)("brands %s without changing placeholders or upstream attribution", (key, expected) => {
    expect(productMessage(key, en[key])).toBe(fork ? expected : en[key])
  })

  test.each([
    [
      "settings.about.fork",
      "Sky Agent is an independent fork of OpenCode. It is not affiliated with or endorsed by OpenCode or Anomaly Innovations, Inc.",
    ],
    [
      "settings.about.manualUpdates",
      "Automatic updates are disabled. Install updates manually from a trusted Sky Agent build.",
    ],
  ] as const)("names the fork directly in %s while preserving upstream attribution", (key, expected) => {
    expect(en[key]).toBe(expected)
    expect(productMessage(key, en[key])).toBe(expected)
  })

  test.each([
    "provider.connect.opencode.name",
    "provider.connect.opencode.freeName",
    "settings.about.trademark",
    "settings.about.website",
    "desktop.menu.documentation",
    "server.connect.scan.invalid",
  ] as const)("preserves the upstream identity in %s", (key) => {
    expect(productMessage(key, en[key])).toBe(en[key])
  })
})

describe("rich translations", () => {
  test("lets the translated phrase position a rich slot", () => {
    const names = { type: "names" }
    expect(richTemplateParts("Written by {{names}}", { names })).toEqual(["Written by ", names])
    expect(richTemplateParts("{{names}} tarafından yazıldı", { names })).toEqual([names, " tarafından yazıldı"])
  })

  test("keeps list elements intact while localizing punctuation", () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }]
    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- the check is that no element was stringified
    expect(localizedListParts("en", items).filter((part) => typeof part !== "string")).toEqual(items)
  })
})

describe("dictionaries", () => {
  test("are flat string maps in every locale", async () => {
    const modules = await Promise.all(
      DESKTOP_NATIVE_LOCALES.flatMap((locale) => [import(`./${locale}`), import(`../../../../ui/src/i18n/${locale}`)]),
    )

    const nested = modules.flatMap((module) =>
      // oxlint-disable-next-line anti-slop/no-runtime-typeof -- the check is that no value is nested
      Object.entries<unknown>(module.dict).filter(([, value]) => typeof value !== "string"),
    )

    expect(nested).toEqual([])
  })
})
