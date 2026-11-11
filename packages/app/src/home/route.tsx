import { ScrollView } from "@opencode/ui/scroll-view"
import { createMediaQuery } from "@solid-primitives/media"
import { Show } from "solid-js"
import { createHomeController } from "./model"
import { createHomeProjectsController } from "./projects/controller"
import { HomeUtilityNav } from "./projects/view"
import { HomeProjects } from "./projects/region"
import { createHomeScrollController } from "./scroll"
import { createHomeSessionSearchController } from "./sessions/search"
import { createHomeSessionsController } from "./sessions/controller"
import { HomeSessions } from "./sessions/region"
import { Button } from "@opencode/ui/button"
import { createStore } from "solid-js/store"
import { IS_SQUARE_AGENT } from "@/brand"
import { HomeBots } from "@/bots/home"

export function Home() {
  const mobile = createMediaQuery("(max-width: 767px)")
  const home = createHomeController()
  const projects = createHomeProjectsController(home)
  const sessions = createHomeSessionsController(home)
  const search = createHomeSessionSearchController(home, sessions)
  const scroll = createHomeScrollController(sessions.data.groups)
  const [state, setState] = createStore({ view: "sessions" as "sessions" | "bots" })

  return (
    <div
      data-slot="home-panel"
      class={`
        mx-[var(--shell-inline-inset,8px)] mb-[var(--shell-bottom-inset,8px)] mt-[var(--shell-top-inset,8px)] flex min-h-0 flex-1 flex-col self-stretch overflow-hidden rounded-[10px]
        bg-v2-background-bg-base shadow-[var(--v2-elevation-raised)]
      `}
    >
      <Show when={IS_SQUARE_AGENT}>
        <nav aria-label={sessions.copy.language.t("bots.navigation")} class="flex shrink-0 justify-end gap-1 px-4 pt-3">
          <Button variant="ghost" aria-pressed={state.view === "sessions"} onClick={() => setState("view", "sessions")}>
            {sessions.copy.language.t("bots.sessions")}
          </Button>
          <Button variant="ghost" aria-pressed={state.view === "bots"} onClick={() => setState("view", "bots")}>
            {sessions.copy.language.t("bots.title")}
          </Button>
        </nav>
      </Show>
      <Show when={mobile()}>
        <div class="relative z-40 -mb-3 shrink-0 px-3 pt-3">
          <HomeProjects projects={projects} scroll={scroll} dropdown />
        </div>
      </Show>
      <ScrollView
        class="min-h-0 flex-1 [container-type:size]"
        thumbContainer={scroll.viewport.thumbTrack()}
        thumbHoverTarget={scroll.viewport.hoverTarget()}
        viewportRef={scroll.viewport.setViewport}
        onScroll={(event) => scroll.viewport.update(event.currentTarget.scrollTop)}
      >
        <div
          class={`
            mx-auto grid min-h-full w-full max-w-[1080px] grid-rows-[auto_minmax(0,1fr)] gap-4 px-3
            max-md:grid-rows-[minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,720px)] lg:grid-rows-1 lg:gap-8 lg:px-6
          `}
        >
          <Show when={!mobile()}>
            <HomeProjects projects={projects} scroll={scroll} />
          </Show>
          <Show
            when={IS_SQUARE_AGENT && state.view === "bots"}
            fallback={<HomeSessions sessions={sessions} search={search} scroll={scroll} />}
          >
            <HomeBots home={home} sessions={sessions} />
          </Show>
        </div>
      </ScrollView>
      <div class="hidden shrink-0 px-3 py-2 md:block lg:hidden">
        <HomeUtilityNav
          class="flex"
          onOpenSettings={projects.utility.settings}
          onOpenHelp={projects.utility.help}
          language={projects.copy.language}
        />
      </div>
    </div>
  )
}
