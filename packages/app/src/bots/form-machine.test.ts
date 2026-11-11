import { expect, test } from "bun:test"
import { transitionBotForm, type BotFormState } from "./form-machine"

test("save claims synchronously, retries failures and ignores stale or disposed results", () => {
  const initial: BotFormState = { status: "editing", attempt: 0 }
  const saving = transitionBotForm(initial, { type: "submit" })
  expect(saving).toEqual({ status: "saving", attempt: 1 })
  expect(transitionBotForm(saving, { type: "submit" })).toBe(saving)
  expect(transitionBotForm(saving, { type: "saved", attempt: 0 })).toBe(saving)
  const failed = transitionBotForm(saving, { type: "failed", attempt: 1, error: "timeout" })
  expect(failed).toEqual({ status: "editing", attempt: 1, error: "timeout" })
  const retry = transitionBotForm(failed, { type: "submit" })
  expect(transitionBotForm(retry, { type: "saved", attempt: 1 })).toBe(retry)
  expect(transitionBotForm(retry, { type: "saved", attempt: 2 })).toEqual({ status: "closed", attempt: 2 })
  const disposed = transitionBotForm(retry, { type: "disposed" })
  expect(transitionBotForm(disposed, { type: "saved", attempt: 2 })).toBe(disposed)
  expect(transitionBotForm(disposed, { type: "failed", attempt: 2, error: "late" })).toBe(disposed)
})
