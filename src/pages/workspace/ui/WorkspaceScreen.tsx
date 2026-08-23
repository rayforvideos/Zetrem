import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  CrewProvider,
  hintDue,
  hintSeen,
  roster,
  stockAgents,
  withRefused,
  withoutRefused,
} from '@/entities/agent-session'
import { pickProject, projectStore } from '@/entities/project'
import { GRID_PAD } from '@/shared/config/theme'
import { PanelLeft } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useFailure } from '@/shared/lib/failure/failure'
import {
  WORDMARK_SIGNATURE_OPACITY,
  WORDMARK_SIZE,
  Wordmark,
} from '@/shared/graphics/wordmark/wordmark'
import { AgentReport } from '@/widgets/agent-report'
import { awayOf, spokeAtMs, Composer, ConversationPane } from '@/widgets/conversation'
import { SetupPane } from '@/widgets/setup'
import { TeamSidebar, team, toggled } from '@/widgets/team-sidebar'
import { WelcomePane } from '@/widgets/welcome'
import { TileDeck, useDeck, useFleet } from '@/widgets/tile-deck'
import { MOTION } from '@/shared/config/motion/motion'
import { tidyUserName } from '@/entities/user'

import { layerOver } from '@/shared/lib/modal/modal'
import { Titlebar } from '@/widgets/titlebar'
import { screenGate } from '../model/screen-gate/screen-gate'
import { sessionLive, stirring } from '../model/live/live'
import { useAgent } from '../model/use-agent'
import { useAgentDefs } from '../model/use-agent-defs'
import { useAuth } from '../model/use-auth'
import { useAppUpdate } from '../model/use-app-update/use-app-update'
import { useLearnedSettings } from '../model/use-learned-settings'
import { useFocus } from '../model/use-focus'
import { usePlugins } from '../model/use-plugins'
import { useProjectMemory } from '../model/use-project-memory'
import { useSessionProbe } from '../model/use-session-probe'
import { useAuthoredAgents } from '../model/use-authored-agents'
import { useNudge } from '../model/use-nudge'
import { useSay } from '../model/use-say'
import { useConnectors } from '../model/use-connectors'
import { useAttachments } from '../model/use-attachments'
import { useSettings } from '../model/use-settings'
import { useSettingsPanel } from '../model/use-settings-panel'
import { useSidebarWidth } from '../model/use-sidebar-width'
import { useTranscript } from '../model/use-transcript'
import { useViewport } from '../model/use-viewport'
import { useOffsetWidth } from '@/shared/lib/offset-width/use-offset-width'
import { tuckedBy } from '../model/tuck/tuck'
import { crewOf, lockOf, peopleOf, pluginSummary } from '../model/workspace-config/workspace-config'
import { PluginShelfOverlay } from './controls/PluginShelfOverlay'
import { ProjectPicker } from './controls/ProjectPicker'
import { StatusBarPanel } from './controls/StatusBarPanel'
import { t } from '@lingui/core/macro'

export function WorkspaceScreen() {
  const { settings, loading, failure: settingsFailure, update } = useSettings()
  const project = useSyncExternalStore(projectStore.subscribe, projectStore.get, projectStore.get)
  const { defs, drafts, hire, edit, release, note: teamNote } = useAgentDefs()
  const { failure: projectFailure, report: reportProject } = useFailure()

  const authored = useAuthoredAgents(project?.path ?? null)
  const chat = useTranscript(project?.path ?? null)
  const runConfig = {
    permissionMode: settings.permissionMode,
    model: settings.model,
    people: peopleOf(defs),
    lock: lockOf(settings, defs, authored),
    resume: chat.resumeId,
  }
  const agent = useAgent(runConfig, (model) =>
    update({ refusedModels: withRefused(settings.refusedModels, model) }),
  )
  const { conversation: conv, children, status, nowMs } = agent

  useEffect(() => {
    if (!settings.refusedModels.includes(settings.model)) return
    if (status.cost.turns === 0) return
    update({ refusedModels: withoutRefused(settings.refusedModels, settings.model) })
  }, [status.cost.turns, settings.model, settings.refusedModels])

  useSay(settings.tongue, !loading)
  const auth = useAuth()
  useAppUpdate()
  const deck = useDeck()
  const viewport = useViewport()
  const projectKnown = useProjectMemory(reportProject(t`Could not reopen your last project`))
  const panel = useSettingsPanel(settings, update)
  const sidebar = useSidebarWidth(settings, update, viewport.w)
  const [attachSidebar, sidebarBoxW] = useOffsetWidth<HTMLDivElement>()
  const focus = useFocus()

  const gate = screenGate({
    settingsLoaded: !loading,
    authKnown: auth.authKnown,
    projectKnown,
    chatKnown: chat.ready,
    loggedIn: auth.auth?.state === 'signed-in',
    hasProject: project?.path != null,
    setupDone: settings.setupDone,
    onboarded: settings.onboarded,
    settingsOpen: panel.open,
  })

  const [drawerOpen, setDrawerOpen] = useState(false)
  const shelf = usePlugins(gate === 'setup')
  const attach = useAttachments()
  const wires = useConnectors(shelf.open || drawerOpen || gate === 'conversation')
  useSessionProbe(
    runConfig,
    gate !== 'holding' && status.session === null,
    project?.path ?? null,
    gate !== 'holding',
    conv.status === 'working',
  )
  useNudge(settings.notify, conv.status, conv.permission, conv.trouble)
  useFleet(deck, children, nowMs, viewport, sidebar.span + GRID_PAD * 2)

  useLearnedSettings(status, settings, defs, authored, update)

  const stock = stockAgents(
    settings.knownAgents,
    defs.map((def) => def.name),
    authored,
  )
  const openAgent = children.find((session) => session.id === focus.openAgentId) ?? null
  const sessionAgentNames = status.session?.agents ?? []
  const live = sessionLive(status, conv.status)
  const atWork = stirring(conv.status, children)
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || layerOver(document)) return
      setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  function handlePickProject(): void {
    pickProject()
      .then((picked) => {
        if (!picked || picked.path === project?.path) return
        // The running agent is rooted in the old folder; left alive it would
        // keep streaming turns into the new project's transcript.
        agent.reset()
        focus.clearAll()
        projectStore.set(picked)
      })
      .catch(reportProject(t`Could not open that folder`))
  }

  function reload(patch: Partial<typeof settings>, said: string): void {
    update(patch)
    if (status.session === null) return
    focus.clearAll()
    agent.restart(said)
  }

  function swap(go: () => void): void {
    agent.reset()
    focus.clearAll()
    go()
  }

  return (
    <CrewProvider crew={crewOf(defs, status.session?.model ?? null)}>
      <div
        data-live={atWork ? '' : undefined}
        data-talk={conv.status}
        data-activity={status.activity}
        data-spent={`${status.cost.turns}:${status.context.used}`}
        className="flex h-full min-h-0 flex-col"
      >
        <div className="relative min-h-0 flex-1">
          <TileDeck
            state={deck.state}
            sessions={children}
            face={settings.userFace}
            name={tidyUserName(settings.userName)}
            viewport={viewport}
            onDismiss={deck.closeOne}
            nowMs={nowMs}
            sidebarW={sidebar.span + GRID_PAD * 2}
            roster={sidebar.open}
            terminal={
              gate === 'welcome' ? (
                <WelcomePane onDone={() => update({ onboarded: true })} />
              ) : gate === 'holding' ? (
                <div className="relative z-[3] flex h-full items-center justify-center">
                  <Wordmark
                    width={WORDMARK_SIZE.signature}
                    className={WORDMARK_SIGNATURE_OPACITY}
                  />
                </div>
              ) : gate === 'setup' ? (
                <SetupPane
                  account={{
                    auth: auth.auth,
                    error: auth.authError,
                    note: auth.loginNote,
                    signingIn: auth.loggingIn,
                    signingOut: auth.loggingOut,
                    sessionLive: live,
                    installing: auth.installing,
                    onSignIn: auth.login,
                    onInstall: auth.install,
                    onSignOut: () => {
                      // The warning says the running session stops. Stop it, rather
                      // than leaving it holding credentials the user just revoked.
                      swap(auth.logout)
                    },
                  }}
                  you={{
                    name: settings.userName,
                    face: settings.userFace,
                    onName: (next) => update({ userName: next }),
                    onFace: (next) => update({ userFace: next }),
                  }}
                  project={{ chosen: project, onChoose: handlePickProject }}
                  defaults={{
                    permissionMode: settings.permissionMode,
                    model: settings.model,
                    onPermissionMode: (permissionMode) => update({ permissionMode }),
                    tongue: settings.tongue,
                    onTongue: (next) => update({ tongue: next }),
                    notify: settings.notify,
                    onNotify: (on) => update({ notify: on }),
                    onModel: (model) => update({ model }),
                  }}
                  plugins={{
                    summary: pluginSummary(
                      shelf.catalog.installed.length,
                      shelf.marketplaces.length,
                    ),
                    onOpen: shelf.show,
                  }}
                  actions={{
                    reopened: settings.setupDone,
                    signedIn: auth.auth?.state === 'signed-in',
                    hasProject: project?.path != null,
                    onStart: panel.start,
                    onCancel: panel.cancel,
                  }}
                  notice={settingsFailure ?? projectFailure}
                />
              ) : (
                <ConversationPane
                  turns={conv.turns}
                  status={conv.status}
                  statusState={status}
                  permission={conv.permission}
                  you={{ name: tidyUserName(settings.userName), face: settings.userFace }}
                  away={agent.running ? awayOf(children, spokeAtMs(conv.turns)) : null}
                  chores={conv.chores}
                  nowMs={nowMs}
                  hint={hintDue('ask-whole-job', settings.hintsSeen, conv.turns.length === 0)}
                  onHintSeen={() =>
                    update({ hintsSeen: hintSeen('ask-whole-job', settings.hintsSeen) })
                  }
                  onDecide={agent.decide}
                  composer={
                    <Composer
                      files={attach.files}
                      onPick={attach.pick}
                      onTake={attach.take}
                      onDropFile={attach.drop}
                      empty={conv.turns.length === 0}
                      busy={conv.status === 'working'}
                      sessionLive={live}
                      addressee={focus.addressee}
                      permissionMode={settings.permissionMode}
                      model={settings.model}
                      refusedModels={settings.refusedModels}
                      onSend={(text) => {
                        agent.send(text, focus.addressee, attach.files)
                        attach.clear()
                        focus.address(null)
                      }}
                      onStop={agent.stop}
                      onClearAddressee={() => focus.address(null)}
                      onPermissionMode={(permissionMode) =>
                        reload(
                          { permissionMode },
                          t`Permissions changed. Your next message starts a session that follows them.`,
                        )
                      }
                      onModel={(model) =>
                        reload(
                          { model },
                          t`Model changed. Your next message starts a session on it.`,
                        )
                      }
                    />
                  }
                  report={
                    openAgent === null ? null : (
                      <AgentReport
                        session={openAgent}
                        sessions={children}
                        nowMs={nowMs}
                        onClose={() => focus.pick(null)}
                        onPick={focus.pick}
                      />
                    )
                  }
                  sidebar={
                    <div
                      ref={attachSidebar}
                      data-tucked={sidebar.open ? undefined : ''}
                      style={{
                        marginLeft: tuckedBy(sidebar.open, sidebarBoxW, sidebar.width),
                        transition: `margin ${MOTION.moveMs}ms ${MOTION.easing}`,
                      }}
                      className="flex flex-none"
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
                          members: team(
                            defs,
                            sessionAgentNames,
                            roster(sessionAgentNames, children, conv.status !== 'done'),
                          ),
                          drafts,
                          knownTools: settings.knownTools,
                          sessionKnown: status.session !== null,
                          read: focus.read,
                          sessionLive: live,
                          canWrite: true,
                          hint: hintDue('hire-first', settings.hintsSeen, defs.length === 0),
                          onHintSeen: () =>
                            update({ hintsSeen: hintSeen('hire-first', settings.hintsSeen) }),
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
                          onChange: (name, on) =>
                            reload(
                              { stockAgents: toggled(settings.stockAgents, name, on) },
                              on
                                ? t`${name} can be called now. Your next message starts a session that can reach them.`
                                : t`${name} is off. Your next message starts a session without them.`,
                            ),
                        }}
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

          <PluginShelfOverlay shelf={shelf} wires={wires} project={project?.path ?? null} />
        </div>
        <StatusBarPanel
          shown={gate !== 'welcome'}
          status={status}
          wires={wires}
          nowMs={nowMs}
          open={drawerOpen}
          onToggle={() => setDrawerOpen((was) => !was)}
        />
      </div>

      <Titlebar
        left={
          settings.setupDone && (
            <Button
              variant="quiet"
              size="bare"
              onClick={sidebar.toggle}
              aria-pressed={sidebar.open}
              aria-label={sidebar.open ? t`Hide team sidebar` : t`Show team sidebar`}
              title={sidebar.open ? t`Hide team sidebar` : t`Show team sidebar`}
              className="zt-hit"
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
            className="zt-hit text-xs"
            title={t`Change account, project, and permissions`}
          >
            {t`Settings`}
          </Button>
        )}
        <ProjectPicker onChoose={handlePickProject} />
      </Titlebar>
    </CrewProvider>
  )
}
