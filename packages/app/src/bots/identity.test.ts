import { expect, test } from "bun:test"
import type { SessionInfo } from "@opencode/client/promise"
import { BOT_METADATA_KEY, botIdentity, chooseBotAvatar } from "./identity"

test("only the owning root session presents persisted, supported bot metadata", () => {
  const bot = {
    id: "ses_alpha",
    metadata: {
      [BOT_METADATA_KEY]: {
        version: 1,
        sessionID: "ses_alpha",
        avatar: { shape: "mug", color: "#1f7cf2" },
      },
    },
  }

  expect(botIdentity(JSON.parse(JSON.stringify(bot)))).toEqual({ shape: "mug", color: "#1f7cf2" })
  expect(botIdentity({ ...bot, id: "ses_fork" })).toBeUndefined()
  expect(botIdentity({ ...bot, parentID: "ses_parent" })).toBeUndefined()
  expect(botIdentity({ id: "ses_normal" })).toBeUndefined()

  const invalid: NonNullable<SessionInfo["metadata"]>[string][] = [
    null,
    [],
    "mug",
    { version: 2 },
    { version: 1, sessionID: bot.id, avatar: { shape: "<script>", color: "#1f7cf2" } },
  ]

  for (const value of invalid) {
    expect(botIdentity({ id: bot.id, metadata: { [BOT_METADATA_KEY]: value } })).toBeUndefined()
  }
})

test("random assignment exhausts all 56 distinct local combinations before repeating", () => {
  const bots: Pick<SessionInfo, "id" | "metadata">[] = []
  const combinations = new Set<string>()

  for (let index = 0; index < 56; index++) {
    const avatar = chooseBotAvatar(bots)
    const id = `ses_${index}`
    combinations.add(`${avatar.shape}/${avatar.color}`)
    bots.push({ id, metadata: { [BOT_METADATA_KEY]: { version: 1, sessionID: id, avatar } } })
  }

  expect(combinations.size).toBe(56)
  const reused = chooseBotAvatar(bots)
  expect(combinations.has(`${reused.shape}/${reused.color}`)).toBe(true)
})
