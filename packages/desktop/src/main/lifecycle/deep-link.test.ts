import { describe, expect, test } from "bun:test"
import { consoleReturnWindow, normalizeDeepLink } from "./deep-link"

describe("Console return deep links", () => {
  test.each(["opencode", "square-agent", "square-agent-dev", "square-agent-beta"])(
    "reads %s return links",
    (scheme) => {
      expect(consoleReturnWindow(`${scheme}://console/authorized?window=window-a`)).toBe("window-a")
      expect(consoleReturnWindow(`${scheme}://console/authorized?window=window%20b`)).toBe("window b")
      expect(normalizeDeepLink(`${scheme}://open?project=%2Frepo%20a`)).toBe("opencode://open?project=%2Frepo%20a")
    },
  )

  test("rejects unrelated and malformed links", () => {
    expect(consoleReturnWindow("square-agent-evil://console/authorized?window=window-a")).toBeUndefined()
    expect(consoleReturnWindow("opencode://console/other?window=window-a")).toBeUndefined()
    expect(consoleReturnWindow("opencode://other/authorized?window=window-a")).toBeUndefined()
    expect(consoleReturnWindow("https://console/authorized?window=window-a")).toBeUndefined()
    expect(consoleReturnWindow("not a url")).toBeUndefined()
    expect(consoleReturnWindow("opencode://console/authorized")).toBeUndefined()
  })
})
