import type { SessionInfo } from "@opencode/client/promise"
import { Session } from "@opencode/schema/session"
import { Button } from "@opencode/ui/button"
import { useDialog } from "@opencode/ui/context/dialog"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitleGroup } from "@opencode/ui/dialog"
import { Loader } from "@opencode/ui/loader"
import { TextField } from "@opencode/ui/text-field"
import { skipToken, useQuery, useQueryClient } from "@tanstack/solid-query"
import { createEffect, createMemo, createSignal, For, onCleanup, Show, untrack } from "solid-js"
import { createStore } from "solid-js/store"
import type { HomeController } from "@/home/model"
import type { HomeSessionsController } from "@/home/sessions/controller"
import { useLanguage } from "@/runtime/i18n/language"
import { ServerConnection } from "@/runtime/server/registry"
import { mergeRootSessionIndex } from "@/runtime/server/session-index"
import { listAllSessions } from "@/session/list"
import { sessionLabel } from "@/session/title"
import { pathKey } from "@/workspaces/path-key"
import { BotAvatar } from "./avatar"
import { BOT_METADATA_KEY, botIdentity, chooseBotAvatar } from "./identity"
import { transitionBotForm, type BotFormEvent, type BotFormState } from "./form-machine"

export function HomeBots(props: { home: HomeController; sessions: HomeSessionsController }) {
  const language = useLanguage()
  const dialog = useDialog()
  const client = useQueryClient()
  const context = props.home.server.focusedContext
  const connection = props.home.server.focused

  const query = useQuery(() => {
    const ctx = context()

    return {
      queryKey: ["bots", connection()],
      queryFn: ctx
        ? async ({ signal }: { signal: AbortSignal }) => {
            const sessions = await listAllSessions(
              ctx.sdk.api.session,
              { parentID: null, order: "desc", limit: 500 },
              {
                signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
              },
            )

            return sessions.filter((session) => !!botIdentity(session))
          }
        : skipToken,
      enabled: ctx?.sdk.connection.status() === "connected",
      retry: false,
      refetchOnMount: "always" as const,
      select: (sessions: SessionInfo[]) => () => sessions,
    }
  })

  const bots = createMemo(() => {
    const ctx = context()

    if (!ctx || query.isPending) return []

    return ctx.data.session
      .apply(mergeRootSessionIndex(query.data?.() ?? [], ctx.data.session.known()))
      .filter((session) => !!botIdentity(session))
  })

  const visible = createMemo(() =>
    bots().filter((session) => {
      const project = props.home.project.selected()

      return (
        !project ||
        session.projectID === project.id ||
        pathKey(session.location.directory) === pathKey(project.worktree)
      )
    }),
  )

  createEffect(() => {
    const ctx = context()
    const conn = connection()

    if (!ctx || !conn) return
    const refresh = () => void client.invalidateQueries({ queryKey: ["bots", conn], exact: true })
    onCleanup(ctx.data.on("session.created", refresh))
    onCleanup(ctx.data.on("session.renamed", refresh))
    onCleanup(ctx.data.on("session.deleted", refresh))
    onCleanup(ctx.data.on("session.metadata.updated", refresh))
  })

  const edit = (session?: SessionInfo) => {
    const ctx = context()
    const conn = connection()
    const directory = session?.location.directory ?? props.home.project.newSession()?.worktree

    if (!ctx || !conn || !directory || query.isPending || query.isError) return
    const id = session?.id ?? Session.ID.create()
    const avatar = session ? botIdentity(session)! : chooseBotAvatar(bots())

    const refresh = () => {
      void client.invalidateQueries({ queryKey: ["bots", conn], exact: true })
      void client.invalidateQueries({ queryKey: ["home-sessions", conn], exact: true })
    }

    const BotForm = () => {
      const layer = useDialog()
      const [form, setForm] = createStore({ name: session?.title ?? "" })
      const [machine, setMachine] = createSignal<BotFormState>({ status: "editing", attempt: 0 })
      const dispatch = (event: BotFormEvent) => setMachine((state) => transitionBotForm(state, event))
      const busy = () => machine().status !== "editing"

      const error = () => {
        const state = machine()

        return state.status === "editing" ? state.error : undefined
      }

      const request = new AbortController()
      createEffect(() => {
        if (!layer.closing) return
        dispatch({ type: "disposed" })
        request.abort()
      })
      onCleanup(() => {
        dispatch({ type: "disposed" })
        request.abort()
      })

      const save = async (event: SubmitEvent) => {
        event.preventDefault()

        if (busy() || !form.name.trim()) return
        dispatch({ type: "submit" })
        const attempt = untrack(machine).attempt
        const name = form.name.trim()
        const signal = AbortSignal.any([request.signal, AbortSignal.timeout(15_000)])

        try {
          const info = session
            ? await props.sessions.session.rename(ServerConnection.key(conn), session, name, signal).then((saved) => {
                if (!saved) throw new Error(language.t("common.requestFailed"))

                return ctx.data.session.get(session.id) ?? { ...session, title: name }
              })
            : await ctx.sdk.api.session.create(
                {
                  id,
                  title: name,
                  location: { directory },
                  metadata: { [BOT_METADATA_KEY]: { version: 1, sessionID: id, avatar } },
                },
                { signal },
              )

          ctx.data.session.remember(info)
          refresh()
          dispatch({ type: "saved", attempt })

          if (layer.closing || request.signal.aborted || machine().status !== "closed" || machine().attempt !== attempt)
            return
          layer.close()

          if (!session) props.home.project.openProjectSession(conn, directory, info)
        } catch {
          refresh()
          dispatch({ type: "failed", attempt, error: language.t("bots.saveFailed") })
        }
      }

      return (
        <Dialog fit>
          <form class="w-full" onSubmit={save}>
            <DialogHeader>
              <DialogTitleGroup title={language.t(session ? "bots.rename" : "bots.create")} description={directory} />
            </DialogHeader>
            <DialogBody class="flex flex-col gap-4 px-4 py-3">
              <div class="flex justify-center">
                <BotAvatar avatar={avatar} running={false} />
              </div>
              <TextField
                label={language.t("bots.name")}
                value={form.name}
                onChange={(name) => setForm("name", name)}
                autofocus
                required
                maxLength={120}
                disabled={busy()}
              />
              <Show when={error()}>
                {(error) => (
                  <p role="alert" class="text-v2-text-text-base text-[13px]">
                    {error()}
                  </p>
                )}
              </Show>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => layer.close()}>
                {language.t("common.cancel")}
              </Button>
              <Button type="submit" disabled={busy() || !form.name.trim()}>
                <Show when={busy()}>
                  <Loader />
                </Show>
                {language.t(session ? "common.save" : "bots.create")}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      )
    }

    void dialog.show(() => <BotForm />)
  }

  return (
    <section aria-label={language.t("bots.title")} class="min-w-0 py-4">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-[18px] font-medium text-v2-text-text-base">{language.t("bots.title")}</h1>
        <Button onClick={() => edit()} disabled={!props.home.project.newSession() || query.isPending || query.isError}>
          {language.t("bots.create")}
        </Button>
      </div>
      <p class="mb-5 max-w-xl text-[13px] leading-[var(--line-height-base)] text-v2-text-text-muted">
        {language.t("bots.description")}
      </p>
      <Show when={!props.home.project.newSession()}>
        <p class="text-[13px] text-v2-text-text-muted">{language.t("bots.chooseProject")}</p>
      </Show>
      <Show when={query.isPending && context()?.sdk.connection.status() === "connected"}>
        <Loader />
      </Show>
      <Show when={query.isError}>
        <p role="alert" class="text-[13px] text-v2-text-text-muted">
          {language.t("bots.loadFailed")}
        </p>
        <Button variant="ghost" onClick={() => void query.refetch()}>
          {language.t("common.retry")}
        </Button>
      </Show>
      <Show when={!query.isPending && !query.isError && visible().length === 0}>
        <p class="py-8 text-[13px] text-v2-text-text-muted">{language.t("bots.empty")}</p>
      </Show>
      <ul class="grid grid-cols-1 gap-2 pb-6 sm:grid-cols-2">
        <For each={visible()}>
          {(session) => {
            const running = () => context()?.data.session.status(session.id) === "running"

            return (
              <li class="min-w-0 rounded-lg border border-v2-border-border-base p-3">
                <button
                  type="button"
                  class="flex w-full min-w-0 items-center gap-3 rounded-md p-1 text-start hover:bg-v2-overlay-simple-overlay-hover"
                  onClick={() => props.sessions.session.open(session)}
                >
                  <BotAvatar avatar={botIdentity(session)!} running={running()} />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-[13px] font-medium text-v2-text-text-base">
                      {sessionLabel(session)}
                    </span>
                    <span class="block truncate text-[12px] text-v2-text-text-muted">{session.location.directory}</span>
                    <span class="block text-[12px] text-v2-text-text-muted">
                      {language.t(running() ? "session.timeline.working" : "bots.idle")}
                    </span>
                  </span>
                </button>
                <div class="mt-2 flex justify-end gap-1">
                  <Button size="small" variant="ghost" onClick={() => edit(session)}>
                    {language.t("common.rename")}
                  </Button>
                  <Button
                    size="small"
                    variant="ghost"
                    onClick={() => {
                      const conn = connection()

                      if (conn) void props.sessions.session.showDelete(ServerConnection.key(conn), session)
                    }}
                  >
                    {language.t("session.delete.button")}
                  </Button>
                </div>
              </li>
            )
          }}
        </For>
      </ul>
    </section>
  )
}
