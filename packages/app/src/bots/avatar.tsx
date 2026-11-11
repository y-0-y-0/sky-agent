import { createEffect, onCleanup, onMount } from "solid-js"
import { createStore } from "solid-js/store"
import { observeReducedMotion, prefersReducedMotion } from "@opencode/ui/motion"
import { getExample, renderAvatarSvg } from "open-bot-avatar"
import { mountAvatar } from "open-bot-avatar/dom"

export function BotAvatar(props: { avatar: { shape: string; color: string }; running: boolean; compact?: boolean }) {
  let host!: HTMLDivElement
  const [state, setState] = createStore({ reducedMotion: prefersReducedMotion() })

  onMount(() => {
    const canvas = supportsCanvas()
    onCleanup(observeReducedMotion(() => setState("reducedMotion", prefersReducedMotion())))

    createEffect(() => {
      // Only bundled definitions enter the renderer; metadata never supplies SVG or paths.
      const definition = getExample(props.avatar.shape)

      if (!definition) return

      const color = props.avatar.color
      const mood = props.running ? "thinking" : "idle"

      if (state.reducedMotion || !canvas || (!props.compact && !props.running)) {
        host.innerHTML = renderAvatarSvg(definition, {
          color,
          motion: mood,
          size: props.compact ? 28 : 48,
          reducedMotion: true,
        })
        onCleanup(() => host.replaceChildren())

        return
      }

      const avatar = mountAvatar(host, {
        definition,
        color,
        mood,
        followPointer: !!props.compact,
        reducedMotion: false,
        label: "",
      })

      onCleanup(() => avatar.destroy())
    })
  })

  return (
    <div
      ref={host}
      aria-hidden="true"
      class="relative shrink-0 pointer-events-none"
      style={{ width: props.compact ? "28px" : "48px", height: props.compact ? "28px" : "48px" }}
    />
  )
}

function supportsCanvas() {
  if (typeof Path2D === "undefined") return false

  // A blocked or unavailable canvas must still leave a visible, static avatar.
  try {
    return !!document.createElement("canvas").getContext("2d")
  } catch {
    return false
  }
}
