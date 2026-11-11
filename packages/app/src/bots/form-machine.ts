export type BotFormState =
  | { status: "editing"; attempt: number; error?: string }
  | { status: "saving"; attempt: number }
  | { status: "closed"; attempt: number }

export type BotFormEvent =
  | { type: "submit" }
  | { type: "saved"; attempt: number }
  | { type: "failed"; attempt: number; error: string }
  | { type: "disposed" }

export function transitionBotForm(state: BotFormState, event: BotFormEvent): BotFormState {
  if (event.type === "disposed") return { status: "closed", attempt: state.attempt + 1 }

  if (state.status === "closed") return state

  if (event.type === "submit")
    return state.status === "editing" ? { status: "saving", attempt: state.attempt + 1 } : state

  if (state.status !== "saving" || event.attempt !== state.attempt) return state

  return event.type === "saved"
    ? { status: "closed", attempt: state.attempt }
    : { status: "editing", attempt: state.attempt, error: event.error }
}
