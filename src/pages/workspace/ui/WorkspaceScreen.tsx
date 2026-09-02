import { CrewProvider } from '@/entities/teammate'
import { withSessionAuth } from '@/entities/connector'
import { PanelLeft } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  WORDMARK_SIGNATURE_OPACITY,
  WORDMARK_SIZE,
  Wordmark,
} from '@/shared/graphics/Wordmark/Wordmark'
import { WelcomePane } from '@/widgets/welcome'
import { TileDeck } from '@/widgets/tile-deck'
import { GitDesk } from '@/widgets/git-desk'
import { Titlebar } from '@/widgets/titlebar'
import { crewOf } from '../model/team/workspace-config/workspace-config'
import { PluginShelfOverlay } from './controls/PluginShelfOverlay'
import { StatusBarPanel } from './controls/StatusBarPanel'
import { WorkspaceSidebar } from './controls/WorkspaceSidebar'
import { ConversationGate } from './gates/ConversationGate'
import { LibraryGate } from './gates/LibraryGate'
import { SetupGate } from './gates/SetupGate'
import { t } from '@lingui/core/macro'

import { useStarAsk } from '../model/chat/useStarAsk/useStarAsk'
import { useLibraryNotes } from '../model/library/useLibraryNotes'
import { useLibraryProposals } from '../model/library/useLibraryProposals'
import { useWorkspace } from '../model/screen/useWorkspace/useWorkspace'
import { chatOfHost } from '../model/session/host-chats/host-chats'

// The shell: it composes the workspace's domains into the gates, and holds
// nothing of its own beyond the library notes and the suggestions waiting on
// them, which the sidebar and the gates share.
export function WorkspaceScreen() {
  const work = useWorkspace()
  const { chatting, extensions, layout, prefs, projects, team } = work
  const { conv, nowMs, status } = chatting
  const { settings, update } = prefs

  const library = useLibraryNotes(
    layout.libraryOpen,
    conv.status !== 'working',
    projects.current?.path ?? null,
  )
  const proposals = useLibraryProposals(projects.current?.path ?? null)
  useStarAsk(conv.status === 'working', chatting.chat.chats.length, settings, update)

  // A proposal names the host that raised it; the title it shows is the chat
  // that host was running in, when this screen still remembers it.
  const chatTitleOf = (session: string): string | null => {
    const chatId = chatOfHost(session)
    if (chatId === null) return null
    return chatting.chat.chats.find((one) => one.id === chatId)?.title ?? null
  }

  // A note still being typed is saved into this project before the next one
  // takes over.
  const openProject = (id: string): void => void library.flush().then(() => projects.open(id))

  const sidebar = (
    <WorkspaceSidebar
      work={work}
      library={library}
      proposals={proposals}
      onOpenProject={openProject}
    />
  )

  return (
    <CrewProvider crew={crewOf(team.defs, status.session?.model ?? null)}>
      <div
        data-live={chatting.atWork ? '' : undefined}
        data-talk={conv.status}
        data-activity={status.activity}
        data-spent={`${status.cost.turns}:${status.context.used}`}
        className="flex h-full min-h-0 flex-col"
      >
        <div className="relative min-h-0 flex-1">
          <TileDeck
            state={layout.deck.state}
            sessions={chatting.children}
            face={settings.userFace}
            name={team.yourName}
            viewport={layout.viewport}
            onDismiss={layout.deck.closeOne}
            nowMs={nowMs}
            sidebarW={layout.deckSidebarW}
            roster={layout.sidebar.open}
            terminal={
              layout.gate === 'welcome' ? (
                <WelcomePane onDone={() => update({ onboarded: true })} />
              ) : layout.gate === 'holding' ? (
                <div className="relative z-[3] flex h-full items-center justify-center">
                  <Wordmark
                    width={WORDMARK_SIZE.signature}
                    className={WORDMARK_SIGNATURE_OPACITY}
                  />
                </div>
              ) : layout.gate === 'setup' ? (
                <SetupGate work={work} onOpenProject={openProject} />
              ) : layout.libraryOpen ? (
                <LibraryGate
                  library={library}
                  proposals={proposals}
                  chatTitleOf={chatTitleOf}
                  nowMs={nowMs}
                  sidebar={sidebar}
                />
              ) : (
                <ConversationGate
                  work={work}
                  library={library}
                  proposals={proposals}
                  chatTitleOf={chatTitleOf}
                  sidebar={sidebar}
                />
              )
            }
          />

          <PluginShelfOverlay
            shelf={extensions.shelf}
            wires={{
              ...extensions.wires,
              connectors: withSessionAuth(extensions.wires.connectors, status.session?.mcp ?? []),
            }}
            project={projects.current?.path ?? null}
          />
        </div>
        <StatusBarPanel
          shown={layout.gate !== 'welcome'}
          status={status}
          conversationStore={chatting.agent.conversationStore}
          wires={extensions.wires}
          nowMs={nowMs}
          open={layout.drawerOpen}
          onToggle={() => layout.setDrawerOpen((was) => !was)}
        />
      </div>

      <Titlebar
        left={
          settings.setupDone && (
            <Button
              variant="quiet"
              size="bare"
              onClick={layout.sidebar.toggle}
              aria-pressed={layout.sidebar.open}
              aria-label={layout.sidebarLabel}
              title={layout.sidebarLabel}
              className="zt-hit"
            >
              <PanelLeft className="size-3.5" />
            </Button>
          )
        }
      >
        {settings.setupDone && <GitDesk project={projects.current?.path ?? null} />}
        {settings.setupDone && (
          <Button
            variant="quiet"
            size="bare"
            onClick={layout.panel.show}
            className="zt-hit text-xs"
            title={t`Change account, project, and permissions`}
          >
            {t`Settings`}
          </Button>
        )}
      </Titlebar>
    </CrewProvider>
  )
}
