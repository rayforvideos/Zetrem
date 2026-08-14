import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import { CrewProvider, addressed, roster, sessionStore } from '@/entities/agent-session'
import type { Crew, Settings } from '@/entities/agent-session'
import { pickProject, projectStore, restoreProject } from '@/entities/project'
import { TILE_MIN_DWELL_MS } from '@/shared/config/motion/motion'
import { GRID_PAD, SIDEBAR_SPAN } from '@/shared/config/theme'
import { PanelLeft } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { ConversationPane } from '@/widgets/conversation'
import { AgentReport } from '@/widgets/agent-report'
import { TeamSidebar, team } from '@/widgets/team-sidebar'
import { SetupPane } from '@/widgets/setup'
import { TileDeck, closingIds, useDeck, visibleIds } from '@/widgets/tile-deck'
import { Titlebar } from '@/widgets/titlebar'
import { WORDMARK_SIGNATURE_OPACITY, WORDMARK_SIZE, Wordmark } from '@/shared/graphics/wordmark/wordmark'
import { screenGate } from '../model/screen-gate/screen-gate'
import { useFailure } from '@/shared/lib/failure/failure'
import { useAuth } from '../model/use-auth'
import { useCliUpdate } from '../model/use-cli-update'
import { useAgentDefs } from '../model/use-agent-defs'
import { useSettings } from '../model/use-settings'
import { useAgent } from '../model/use-agent'
import { ProjectPicker } from './controls/ProjectPicker'

export function WorkspaceScreen() {
  const { settings, loading, failure: settingsFailure, update } = useSettings()
  const project = useSyncExternalStore(projectStore.subscribe, projectStore.get, projectStore.get)
  const { defs, drafts, hire, edit, release, note: teamNote } = useAgentDefs()

  const people = defs.map((def) => ({
    name: def.name,
    description: def.description,
    prompt: def.prompt,
    model: def.model,
  }))

  const lock =
    settings.onlyOurAgents && settings.knownTools.length > 0
      ? { knownTools: settings.knownTools }
      : null

  const { conversation: conv, children, status, nowMs, send, decide, stop } = useAgent({
    permissionMode: settings.permissionMode,
    model: settings.model,
    people,
    lock,
  })
  const crew: Crew = {
    members: Object.fromEntries(
      defs.map((def) => [def.name, { character: def.character, model: def.model }]),
    ),
    fallbackModel: status.session?.model ?? null,
  }

  const { auth, authKnown, loggingIn, loginNote, login, loggingOut, logout, authError } = useAuth()
  const { failure: projectFailure, report: reportProject } = useFailure()
  const cliUpdate = useCliUpdate(status.session?.cliVersion ?? null)
  const { state, launch: fanOut, openOne, closeOne } = useDeck()
  const [projectKnown, setProjectKnown] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const undoSettings = useRef<Settings | null>(null)
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))

  const sessionTools = status.session?.tools
  useEffect(() => {
    if (sessionTools === undefined || sessionTools.length === 0) return
    if (sessionTools.join('\u0000') === settings.knownTools.join('\u0000')) return
    update({ knownTools: sessionTools })
  }, [sessionTools, settings.knownTools, update])
  const [openAgentId, setOpenAgentId] = useState<string | null>(null)
  const [addressee, setAddressee] = useState<string | null>(null)
  const openAgent = children.find((session) => session.id === openAgentId) ?? null
  const gate = screenGate({
    settingsLoaded: !loading,
    authKnown,
    projectKnown,
    loggedIn: auth?.state === 'signed-in',
    hasProject: project?.path != null,
    setupDone: settings.setupDone,
    settingsOpen,
  })

  useEffect(() => {
    function onResize(): void {
      setViewport({ w: window.innerWidth, h: window.innerHeight })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    restoreProject()
      .then((restored) => {
        if (restored && projectStore.get() === null) projectStore.set(restored)
      })
      .catch(reportProject('Could not reopen your last project'))
      .finally(() => setProjectKnown(true))
  }, [])

  useEffect(() => {
    const placed = new Set([...visibleIds(state), ...closingIds(state)])
    const fresh = children.filter((session) => session.status !== 'done' && !placed.has(session.id))
    if (fresh.length === 0) return
    if (state.kind === 'solo') fanOut(fresh.map((session) => session.id))
    else for (const session of fresh) openOne(session.id)
  }, [children, state, fanOut, openOne])

  useEffect(() => {
    for (const session of children) {
      if (session.status !== 'done') continue
      if (nowMs - session.startedAtMs < TILE_MIN_DWELL_MS) continue
      closeOne(session.id)
      sessionStore.remove(session.id)
    }
  }, [children, nowMs, closeOne])

  function handlePickProject(): void {
    pickProject()
      .then((picked) => {
        if (picked) projectStore.set(picked)
      })
      .catch(reportProject('Could not open that folder'))
  }

  return (
    <CrewProvider crew={crew}>
      <TileDeck
        state={state}
        sessions={children}
        viewport={viewport}
        nowMs={nowMs}
        sidebarW={(settings.sidebarOpen ? SIDEBAR_SPAN : 0) + GRID_PAD * 2}
        terminal={
          gate === 'holding' ? (
            <div className="relative z-[3] flex h-full items-center justify-center">
              <Wordmark width={WORDMARK_SIZE.signature} className={WORDMARK_SIGNATURE_OPACITY} />
            </div>
          ) : gate === 'setup' ? (
            <SetupPane
              auth={auth}
              project={project}
              permissionMode={settings.permissionMode}
              model={settings.model}
              onLogin={login}
              onPickProject={handlePickProject}
              onPermissionMode={(permissionMode) => update({ permissionMode })}
              onModel={(model) => update({ model })}
              onlyOurAgents={settings.onlyOurAgents}
              onOnlyOurAgents={(onlyOurAgents) => update({ onlyOurAgents })}
              ourAgentCount={defs.length}
              onStart={() => {
                undoSettings.current = null
                setSettingsOpen(false)
                update({ setupDone: true })
              }}
              onCancel={() => {
                const snapshot = undoSettings.current
                undoSettings.current = null
                setSettingsOpen(false)
                if (snapshot !== null) update(snapshot)
              }}
              reopened={settings.setupDone}
              canStart={auth?.state === 'signed-in' && project?.path != null}
              loggingIn={loggingIn}
              loginNote={loginNote}
              onLogout={logout}
              loggingOut={loggingOut}
              authError={authError}
              notice={settingsFailure ?? projectFailure}
              sessionLive={status.session !== null && conv.status !== 'done'}
            />
          ) : (
          <ConversationPane
            turns={conv.turns}
            status={conv.status}
            statusState={status}
            permission={conv.permission}
            nowMs={nowMs}
            permissionMode={settings.permissionMode}
            onPermissionMode={(permissionMode) => update({ permissionMode })}
            model={settings.model}
            onModel={(model) => update({ model })}
            sessionLive={conv.status !== 'done'}
            addressee={addressee}
            onClearAddressee={() => setAddressee(null)}
            onSend={(text) => {
              send(addressed(text, addressee))
              setAddressee(null)
            }}
            onDecide={decide}
            onStop={stop}
            onUpdateCli={cliUpdate.start}
            updatingCli={cliUpdate.updating}
            report={
              openAgent === null ? null : (
                <AgentReport
                  session={openAgent}
                  nowMs={nowMs}
                  onClose={() => setOpenAgentId(null)}
                />
              )
            }
            sidebar={
              <div
                style={{ marginLeft: settings.sidebarOpen ? 0 : -SIDEBAR_SPAN }}
                className="flex flex-none transition-[margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              >
              <TeamSidebar
                members={team(defs, status.session?.agents ?? [], roster(status.session?.agents ?? [], children))}
                sessionKnown={status.session !== null}
                canWrite
                note={teamNote}
                onHire={hire}
                onPick={setOpenAgentId}
                onAddress={setAddressee}
                onRelease={release}
                onEdit={edit}
                drafts={drafts}
              />
              </div>
            }
          />
          )
        }
      />
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
            onClick={() => {
              undoSettings.current = settings
              setSettingsOpen(true)
            }}
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
