import type { SessionInfo } from "@opencode/client/promise"
import { examples } from "open-bot-avatar"

export const BOT_METADATA_KEY = "skyAgentBot"

const colors = ["#f2384b", "#ff6a1a", "#f8a01c", "#1fbf68", "#14b3a5", "#1f7cf2", "#8b5cf6", "#ec4899"]

export type BotAvatarIdentity = { shape: string; color: string }

export function botIdentity(session: Pick<SessionInfo, "id" | "parentID" | "metadata"> | undefined) {
  const value = session?.metadata?.[BOT_METADATA_KEY]

  if (!session || session.parentID || !value || typeof value !== "object" || Array.isArray(value)) return

  // Children and forks inherit metadata; only its original owning session is a bot.
  if (value.version !== 1 || value.sessionID !== session.id) return
  const avatar = value.avatar

  if (!avatar || typeof avatar !== "object" || Array.isArray(avatar)) return

  if (typeof avatar.shape !== "string" || !examples.some((shape) => shape.id === avatar.shape)) return

  if (typeof avatar.color !== "string" || !colors.includes(avatar.color)) return

  return { shape: avatar.shape, color: avatar.color }
}

export function chooseBotAvatar(
  sessions: readonly Pick<SessionInfo, "id" | "parentID" | "metadata">[],
): BotAvatarIdentity {
  const used = new Set(
    sessions.flatMap((session) => {
      const avatar = botIdentity(session)

      return avatar ? [`${avatar.shape}/${avatar.color}`] : []
    }),
  )

  const gallery = examples.flatMap((shape) => colors.map((color) => ({ shape: shape.id, color })))
  const available = gallery.filter((avatar) => !used.has(`${avatar.shape}/${avatar.color}`))
  const choices = available.length ? available : gallery

  return choices[Math.floor(Math.random() * choices.length)]!
}
