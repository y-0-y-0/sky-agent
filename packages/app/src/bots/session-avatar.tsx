import { Show } from "solid-js"
import { IS_SQUARE_AGENT } from "@/brand"
import { useServer } from "@/runtime/server/current"
import { BotAvatar } from "./avatar"
import { botIdentity } from "./identity"

export function SessionBotAvatar(props: { sessionID: string | undefined }) {
  const server = useServer()

  return (
    <Show when={IS_SQUARE_AGENT && props.sessionID}>
      {(id) => (
        <Show when={botIdentity(server.ctx.data.session.get(id()))}>
          {(avatar) => (
            <BotAvatar avatar={avatar()} running={server.ctx.data.session.status(id()) === "running"} compact />
          )}
        </Show>
      )}
    </Show>
  )
}
