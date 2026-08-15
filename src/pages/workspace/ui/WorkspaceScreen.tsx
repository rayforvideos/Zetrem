import { useEffect, useSyncExternalStore } from 'react'
import { CrewProvider, addressed, roster, stockAgents } from '@/entities/agent-session'
import { pickProject, projectStore } from '@/entities/project'
import { GRID_PAD, SIDEBAR } from '@/shared/config/theme'
import { PanelLeft } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useFailure } from '@/shared/lib/failure/failure'
import { WORDMARK_SIGNATURE_OPACITY, WORDMARK_SIZE, Wordmark } from '@/shared/graphics/wordmark/wordmark'
import { AgentReport } from '@/widgets/agent-report'
import { Composer, ConversationPane } from '@/widgets/conversation'
import { PluginShelf, SetupPane } from '@/widgets/setup'
import { TeamSidebar, team, toggled } from '@/widgets/team-sidebar'
import { TileDeck, useDeck, useFleet } from '@/widgets/tile-deck'
import { Titlebar } from '@/widgets/titlebar'
import { remembered } from '../model/remembered/remembered'
import { screenGate } from '../model/screen-gate/screen-gate'
import { useAgent } from '../model/use-agent'
import { useAgentDefs } from '../model/use-agent-defs'
import { useAuth } from '../model/use-auth'
import { useCliUpdate } from '../model/use-cli-update'
import { useFocus } from '../model/use-focus'
import { usePlugins } from '../model/use-plugins'
import { useOutcomes } from '../model/use-outcomes'
import { useProjectMemory } from '../model/use-project-memory'
import { useSessionProbe } from '../model/use-session-probe'
import { useConnectors } from '../model/use-connectors'
import { useSettings } from '../model/use-settings'
import { useSettingsPanel } from '../model/use-settings-panel'
import { useSidebarWidth } from '../model/use-sidebar-width'
import { useTranscript } from '../model/use-transcript'
import { useViewport } from '../model/use-viewport'
import { crewOf, lockOf, peopleOf, pluginSummary } from '../model/workspace-config/workspace-config'
import { ProjectPicker } from './controls/ProjectPicker'

export function WorkspaceScreen() {
  const { settings, loading, failure: settingsFailure, update } = useSettings()
  const project = useSyncExternalStore(projectStore.subscribe, projectStore.get, projectStore.get)
  const { defs, drafts, hire, edit, release, note: teamNote } = useAgentDefs()
  const { failure: projectFailure, report: reportProject } = useFailure()

  const chat = useTranscript(project?.path ?? null)
  const runConfig = {
    permissionMode: settings.permissionMode,
    model: settings.model,
    people: peopleOf(defs),
    lock: lockOf(settings, defs),
    resume: chat.resumeId,
  }
  const agent = useAgent(runConfig)
  const { conversation: conv, children, status, nowMs } = agent

  const auth = useAuth()
  const cliUpdate = useCliUpdate(status.session?.cliVersion ?? null)
  const deck = useDeck()
  const viewport = useViewport()
  const projectKnown = useProjectMemory(reportProject('Could not reopen your last project'))
  const panel = useSettingsPanel(settings, update)
  const sidebar = useSidebarWidth(settings, update)
  const focus = useFocus()

  const gate = screenGate({
    settingsLoaded: !loading,
    authKnown: auth.authKnown,
    projectKnown,
    chatKnown: chat.ready,
    loggedIn: auth.auth?.state === 'signed-in',
    hasProject: project?.path != null,
    setupDone: settings.setupDone,
    settingsOpen: panel.open,
  })

  const shelf = usePlugins(gate === 'setup')
  const wires = useConnectors(shelf.open)
  useSessionProbe(runConfig, gate !== 'holding' && status.session === null)
  useFleet(deck, children, nowMs, viewport, sidebar.span + GRID_PAD * 2)
  useOutcomes(children)

  const sessionTools = status.session?.tools
  const sessionAgents = status.session?.agents
  useEffect(() => {
    const learned = remembered(
      { tools: sessionTools, agents: sessionAgents },
      { tools: settings.knownTools, agents: settings.knownAgents },
    )
    if (learned !== null) update(learned)
  }, [sessionTools, sessionAgents, settings.knownTools, settings.knownAgents, update])

  const stock = stockAgents(settings.knownAgents, defs.map((def) => def.name))
  const openAgent = children.find((session) => session.id === focus.openAgentId) ?? null
  const sessionAgentNames = status.session?.agents ?? []

  function handlePickProject(): void {
    pickProject()
      .then((picked) => {
        if (picked) projectStore.set(picked)
      })
      .catch(reportProject('Could not open that folder'))
  }

  function swap(go: () => void): void {
    agent.reset()
    focus.clearAll()
    go()
  }

  return (
    <CrewProvider crew={crewOf(defs, status.session?.model ?? null)}>
      <TileDeck
        state={deck.state}
        sessions={children}
        viewport={viewport}
        nowMs={nowMs}
        sidebarW={sidebar.span + GRID_PAD * 2}
        terminal={
          gate === 'holding' ? (
            <div className="relative z-[3] flex h-full items-center justify-center">
              <Wordmark width={WORDMARK_SIZE.signature} className={WORDMARK_SIGNATURE_OPACITY} />
            </div>
          ) : gate === 'setup' ? (
            <SetupPane
              auth={auth.auth}
              project={project}
              permissionMode={settings.permissionMode}
              model={settings.model}
              onLogin={auth.login}
              onPickProject={handlePickProject}
              onPermissionMode={(permissionMode) => update({ permissionMode })}
              onModel={(model) => update({ model })}
              onStart={panel.start}
              onCancel={panel.cancel}
              reopened={settings.setupDone}
              canStart={auth.auth?.state === 'signed-in' && project?.path != null}
              loggingIn={auth.loggingIn}
              loginNote={auth.loginNote}
              onLogout={auth.logout}
              loggingOut={auth.loggingOut}
              authError={auth.authError}
              notice={settingsFailure ?? projectFailure}
              sessionLive={status.session !== null && conv.status !== 'done'}
              pluginSummary={pluginSummary(
                shelf.catalog.installed.length,
                shelf.marketplaces.length,
              )}
              onPlugins={shelf.show}
            />
          ) : (
            <ConversationPane
              turns={conv.turns}
              status={conv.status}
              statusState={status}
              permission={conv.permission}
              nowMs={nowMs}
              onDecide={agent.decide}
              composer={
                <Composer
                  empty={conv.turns.length === 0}
                  busy={conv.status === 'working'}
                  sessionLive={conv.status !== 'done'}
                  addressee={focus.addressee}
                  permissionMode={settings.permissionMode}
                  model={settings.model}
                  onSend={(text) => {
                    agent.send(addressed(text, focus.addressee))
                    focus.address(null)
                  }}
                  onStop={agent.stop}
                  onClearAddressee={() => focus.address(null)}
                  onPermissionMode={(permissionMode) => update({ permissionMode })}
                  onModel={(model) => update({ model })}
                />
              }
              onUpdateCli={cliUpdate.start}
              updatingCli={cliUpdate.updating}
              report={
                openAgent === null ? null : (
                  <AgentReport
                    session={openAgent}
                    nowMs={nowMs}
                    onClose={() => focus.pick(null)}
                  />
                )
              }
              sidebar={
                <div
                  style={{ marginLeft: settings.sidebarOpen ? 0 : -(sidebar.width + SIDEBAR.gap) }}
                  className="flex flex-none transition-[margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                >
                  <TeamSidebar
                    chats={{
                      chats: chat.chats,
                      openId: chat.openId,
                      onOpen: (id) => swap(() => chat.open(id)),
                      onStart: () => swap(chat.start),
                      onRemove: chat.remove,
                    }}
                    team={{
                      members: team(defs, sessionAgentNames, roster(sessionAgentNames, children)),
                      drafts,
                      knownTools: settings.knownTools,
                      sessionKnown: status.session !== null,
                      sessionLive: status.session !== null,
                      canWrite: true,
                      note: teamNote,
                      onHire: hire,
                      onEdit: edit,
                      onRelease: release,
                      onPick: focus.pick,
                      onAddress: focus.address,
                      onRestart: () => {
                        focus.clearAll()
                        agent.restart()
                      },
                    }}
                    stock={{
                      stock,
                      on: settings.stockAgents,
                      onChange: (name, on) => update({ stockAgents: toggled(settings.stockAgents, name, on) }),
                    }}
                    status={status}
                    nowMs={nowMs}
                    width={sidebar.width}
                    onResize={sidebar.resize}
                    onResizeEnd={sidebar.commit}
                  />
                </div>
              }
            />
          )
        }
      />

      {shelf.open && (
        <PluginShelf
          connectors={wires.connectors}
          onConnector={wires.act}
          catalog={shelf.catalog}
          marketplaces={shelf.marketplaces}
          loading={shelf.loading || wires.loading}
          note={wires.note ?? shelf.note}
          onAct={shelf.act}
          busy={shelf.busy ?? wires.busy}
          onReload={() => {
            shelf.reload()
            wires.reload()
          }}
          onClose={shelf.hide}
        />
      )}

      <Titlebar
        left={
          settings.setupDone && (
            <Button
              variant="quiet"
              size="bare"
              onClick={() => update({ sidebarOpen: !settings.sidebarOpen })}
              aria-pressed={settings.sidebarOpen}
              aria-label={settings.sidebarOpen ? 'Hide team sidebar' : 'Show team sidebar'}
              title={settings.sidebarOpen ? 'Hide team sidebar' : 'Show team sidebar'}
            >
              <PanelLeft className="size-3.5" />
            </Button>
          )
        }
      >
        {settings.setupDone && (
          <Button
            variant="quiet"
            size="bare"
            onClick={panel.show}
            className="text-xs"
            title="Change account, project, and permissions"
          >
            Settings
          </Button>
        )}
        <ProjectPicker />
      </Titlebar>
    </CrewProvider>
  )
}
