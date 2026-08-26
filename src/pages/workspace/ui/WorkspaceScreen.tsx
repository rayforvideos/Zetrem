import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { hintDue, hintSeen } from '@/entities/settings'
import { CrewProvider, allowedStock, roster, offStock, stockAgents } from '@/entities/teammate'
import { withRefused, withoutRefused } from '@/entities/claude-cli'
import { withSessionAuth } from '@/entities/connector'
import { forgetProject, openProject, pickProject, projectStore } from '@/entities/project'
import type { Project } from '@/entities/project'
import { GRID_PAD } from '@/shared/config/theme'
import { PanelLeft } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useFailure } from '@/shared/lib/failure/failure'
import {
  WORDMARK_SIGNATURE_OPACITY,
  WORDMARK_SIZE,
  Wordmark,
} from '@/shared/graphics/Wordmark/Wordmark'
import { AgentReport } from '@/widgets/agent-report'
import { awayOf, spokeAtMs, Composer, ConversationPane, RestartNote } from '@/widgets/conversation'
import { SetupPane } from '@/widgets/setup'
import { TeamSidebar, addressKey, team } from '@/widgets/team-sidebar'
import { WelcomePane } from '@/widgets/welcome'
import { TileDeck, useDeck, useFleet } from '@/widgets/tile-deck'
import { MOTION } from '@/shared/config/motion/motion'
import { tidyUserName } from '@/entities/user'

import { layerOver } from '@/shared/lib/modal/modal'
import { Titlebar } from '@/widgets/titlebar'
import { screenGate } from '../model/screen/screen-gate/screen-gate'
import { sessionLive, stirring } from '../model/session/live/live'
import { useAgent } from '../model/session/useAgent'
import { useAgentDefs } from '../model/team/useAgentDefs'
import { useAuth } from '../model/account/useAuth'
import { useAppUpdate } from '../model/session/useAppUpdate/useAppUpdate'
import { useLearnedSettings } from '../model/settings/useLearnedSettings'
import { useFocus } from '../model/screen/useFocus'
import { usePlugins } from '../model/extensions/usePlugins'
import { useProjectMemory } from '../model/project/useProjectMemory'
import { useProjects } from '../model/project/useProjects'
import { useSessionProbe } from '../model/session/useSessionProbe'
import { useAuthoredAgents } from '../model/team/useAuthoredAgents'
import { useNudge } from '../model/session/useNudge'
import { useSay } from '../model/settings/useSay'
import { useConnectors } from '../model/extensions/useConnectors'
import { useAttachments } from '../model/chat/useAttachments'
import { useSettings } from '../model/settings/useSettings'
import { useSettingsPanel } from '../model/settings/useSettingsPanel'
import { useSidebarWidth } from '../model/screen/useSidebarWidth'
import { useTranscript } from '../model/chat/useTranscript'
import { useViewport } from '../model/screen/useViewport'
import { useOffsetWidth } from '@/pages/workspace/model/screen/offset-width/useOffsetWidth'
import { tuckedBy } from '../model/screen/tuck/tuck'
import {
  crewOf,
  lockOf,
  peopleOf,
  pluginSummary,
} from '../model/team/workspace-config/workspace-config'
import { PluginShelfOverlay } from './controls/PluginShelfOverlay'
import { StatusBarPanel } from './controls/StatusBarPanel'
import { t } from '@lingui/core/macro'

export function WorkspaceScreen() {
  const { settings, loading, failure: settingsFailure, update } = useSettings()
  const project = useSyncExternalStore(projectStore.subscribe, projectStore.get, projectStore.get)
  const { defs, drafts, hire, edit, release, note: teamNote, settleNote } = useAgentDefs()
  const { failure: projectFailure, report: reportProject } = useFailure()
  const { all: allProjects, refresh: refreshProjects } = useProjects(project)

  const authored = useAuthoredAgents(project?.path ?? null)
  const chat = useTranscript(project?.id ?? null)
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
  }, [status.cost.turns, settings.model, settings.refusedModels, update])

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

  const signedIn = auth.auth?.state === 'signed-in'
  const hasProject = project?.path != null
  const yourName = tidyUserName(settings.userName)
  const deckSidebarW = sidebar.span + GRID_PAD * 2

  const gate = screenGate({
    settingsLoaded: !loading,
    authKnown: auth.authKnown,
    projectKnown,
    chatKnown: chat.ready,
    loggedIn: signedIn,
    hasProject,
    setupDone: settings.setupDone,
    onboarded: settings.onboarded,
    settingsOpen: panel.open,
  })

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pendingRestart, setPendingRestart] = useState<string | null>(null)
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
  useFleet(deck, children, nowMs, viewport, deckSidebarW)

  useLearnedSettings(status, settings, update)

  const stock = stockAgents(
    settings.knownAgents,
    defs.map((def) => def.name),
    authored,
  )
  const openAgent = children.find((session) => session.id === focus.openAgentId) ?? null
  // The probe keeps reporting a session after our child has been stopped, so
  // status.session outlives the thing it describes. For everything the sidebar
  // decides — who can be called, who is held back, whether a restart is worth
  // offering — a session only exists while a child of ours is alive.
  const held = agent.running ? status.session : null
  const sessionAgentNames = held?.agents ?? []
  const teamMembers = team(
    defs,
    sessionAgentNames,
    roster(sessionAgentNames, children, conv.status !== 'done'),
  )
  // A file written before the switches were inverted lists the ones that were
  // on. Only here is the full set of theirs known, so this is where that list
  // becomes the off switches it always meant.
  useEffect(() => {
    if (settings.wasStockOn === null || stock.length === 0) return
    const wasOn = new Set(settings.wasStockOn.map((one) => one.toLocaleLowerCase()))
    update({
      stockOff: stock.filter((name) => !wasOn.has(name.toLocaleLowerCase())),
      wasStockOn: null,
    })
  }, [settings.wasStockOn, stock, update])

  const live = sessionLive(status, conv.status)
  const atWork = stirring(conv.status, children)
  const sidebarLabel = sidebar.open ? t`Hide team sidebar` : t`Show team sidebar`
  const sessionId = status.session?.id ?? null
  // The note asks for a restart; once a different session is up (or none is),
  // the change is either in force or about to be, and the ask is stale.
  useEffect(() => {
    setPendingRestart(null)
    settleNote()
  }, [sessionId, settleNote])
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || layerOver(document)) return
      setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  // The modifier and a digit hand the next message to that teammate, in
  // sidebar order, the way tabs answer to their number everywhere else.
  const addressable = useRef(teamMembers)
  useEffect(() => {
    addressable.current = teamMembers
  })
  useEffect(() => {
    if (gate !== 'conversation') return undefined
    const onKey = (event: KeyboardEvent): void => {
      if (layerOver(document)) return
      const got = addressKey(
        { key: event.key, mod: event.metaKey || event.ctrlKey },
        addressable.current.length,
      )
      if (got === null) return
      event.preventDefault()
      if (got === 'clear') {
        focus.address(null)
        return
      }
      const member = addressable.current[got]
      if (member?.callable) focus.address(member.type)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [gate])

  function adoptProject(picked: Project | null): void {
    // Two projects may share one folder, so identity is the id, not the path.
    if (!picked || picked.id === project?.id) return
    // The running agent is rooted in the old folder; left alive it would
    // keep streaming turns into the new project's transcript.
    agent.reset()
    focus.clearAll()
    projectStore.set(picked)
  }

  function handlePickProject(): void {
    pickProject().then(adoptProject).catch(reportProject(t`Could not open that folder`))
  }

  function handleOpenProject(id: string): void {
    openProject(id).then(adoptProject).catch(reportProject(t`Could not open that folder`))
  }

  function handleForgetProject(id: string): void {
    forgetProject(id)
      .then(async () => {
        if (project !== null && project.id === id) {
          // The next freshest project takes over; with none left, setup asks.
          const next = allProjects.filter((one) => one.id !== id)[0]
          const opened = next === undefined ? null : await openProject(next.id)
          agent.reset()
          focus.clearAll()
          projectStore.set(opened)
        }
        refreshProjects()
      })
      .catch(reportProject(t`Could not remove that project`))
  }

  // A settings change used to stop a running session on the spot; a teammate
  // change always waited for the restart button. This is the teammate way:
  // the change lands in settings, the session runs on, and a note carries
  // the restart for whoever wants it now.
  function reload(patch: Partial<typeof settings>, said: string): void {
    update(patch)
    if (status.session === null) return
    setPendingRestart(said)
  }

  function swap(go: () => void): void {
    agent.reset()
    focus.clearAll()
    go()
  }

  const agentToggles = {
    stock,
    on: allowedStock(stock, settings.stockOff),
    onChange: (name: string, on: boolean) =>
      reload(
        { stockOff: offStock(settings.stockOff, name, on) },
        on
          ? t`${name} is on. The running session cannot call them yet.`
          : t`${name} is off. The running session keeps them until it ends.`,
      ),
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
            name={yourName}
            viewport={viewport}
            onDismiss={deck.closeOne}
            nowMs={nowMs}
            sidebarW={deckSidebarW}
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
                  project={{
                    chosen: project,
                    recent: allProjects.filter((one) => one.id !== project?.id),
                    onChoose: handlePickProject,
                    onPickRecent: handleOpenProject,
                  }}
                  defaults={{
                    permissionMode: settings.permissionMode,
                    model: settings.model,
                    onPermissionMode: (permissionMode) => update({ permissionMode }),
                    tongue: settings.tongue,
                    onTongue: (next) => update({ tongue: next }),
                    notify: settings.notify,
                    onNotify: (on) => update({ notify: on }),
                    enterSends: settings.enterSends,
                    onEnterSends: (on) => update({ enterSends: on }),
                    onModel: (model) => update({ model }),
                  }}
                  plugins={{
                    summary: pluginSummary(
                      shelf.catalog.installed.length,
                      shelf.marketplaces.length,
                    ),
                    onOpen: shelf.show,
                  }}
                  agents={agentToggles}
                  actions={{
                    reopened: settings.setupDone,
                    signedIn,
                    hasProject,
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
                  you={{ name: yourName, face: settings.userFace }}
                  away={agent.running ? awayOf(children, spokeAtMs(conv.turns)) : null}
                  chores={conv.chores}
                  nowMs={nowMs}
                  hint={hintDue('ask-whole-job', settings.hintsSeen, conv.turns.length === 0)}
                  onHintSeen={() =>
                    update({ hintsSeen: hintSeen('ask-whole-job', settings.hintsSeen) })
                  }
                  onDecide={agent.decide}
                  composer={
                    <>
                      {pendingRestart !== null && agent.running && (
                        <RestartNote
                          said={pendingRestart}
                          onRestart={() => {
                            setPendingRestart(null)
                            focus.clearAll()
                            agent.restart()
                          }}
                        />
                      )}
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
                        enterSends={settings.enterSends}
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
                            t`Permissions changed. The running session follows the old ones.`,
                          )
                        }
                        onModel={(model) =>
                          reload({ model }, t`Model changed. The running session keeps its model.`)
                        }
                      />
                    </>
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
                        projects={{
                          current: project,
                          all: allProjects,
                          onOpen: handleOpenProject,
                          onPickFolder: handlePickProject,
                          onForget: handleForgetProject,
                        }}
                        chats={{
                          chats: chat.chats,
                          openId: chat.openId,
                          onOpen: (id) => swap(() => chat.open(id)),
                          onStart: () => swap(chat.start),
                          onRemove: chat.remove,
                          onRename: chat.rename,
                          onFile: chat.file,
                          onFileMany: chat.fileMany,
                        }}
                        team={{
                          members: teamMembers,
                          drafts,
                          knownTools: settings.knownTools,
                          sessionUp: held !== null,
                          read: focus.read,
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
                            settleNote()
                            agent.restart()
                          },
                        }}
                        agents={agentToggles}
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

          <PluginShelfOverlay
            shelf={shelf}
            wires={{
              ...wires,
              connectors: withSessionAuth(wires.connectors, status.session?.mcp ?? []),
            }}
            project={project?.path ?? null}
          />
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
              aria-label={sidebarLabel}
              title={sidebarLabel}
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
      </Titlebar>
    </CrewProvider>
  )
}
