import { useEffect, useState, useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import { addressed, roster, sessionStore } from '@/entities/agent-session'
import { pickProject, projectStore, restoreProject } from '@/entities/project'
import { TILE_MIN_DWELL_MS } from '@/shared/config/motion'
import { GROUND, TEXT } from '@/shared/config/theme'
import { Button } from '@/shared/ui/button'
import { ConversationPane } from '@/widgets/conversation'
import { AgentReport } from '@/widgets/agent-report'
import { TeamSidebar, team } from '@/widgets/team-sidebar'
import { SetupPane } from '@/widgets/setup'
import { TileDeck, closingIds, useDeck, visibleIds } from '@/widgets/tile-deck'
import { Titlebar } from '@/widgets/titlebar'
import { WORDMARK_SIGNATURE_OPACITY, WORDMARK_SIZE, Wordmark } from '@/shared/ui/wordmark'
import { screenGate } from '../model/screen-gate'
import { useAuth } from '../model/use-auth'
import { useCliUpdate } from '../model/use-cli-update'
import { useAgentDefs } from '../model/use-agent-defs'
import { useSettings } from '../model/use-settings'
import { useAgent } from '../model/use-agent'
import { ProjectPicker } from './controls/ProjectPicker'

export function WorkspaceScreen() {
  const { settings, loading, update } = useSettings()
  const project = useSyncExternalStore(projectStore.subscribe, projectStore.get, projectStore.get)
  const { defs, hire, note: teamNote } = useAgentDefs()

  const people = defs.map((def) => ({
    name: def.name,
    description: def.description,
    prompt: def.prompt,
    model: def.model,
  }))

  // 우리가 들인 사람만 부르게 잠근다. 도구 이름을 하나씩 적어야만 제한이 서므로(실측),
  // 세션이 한 번 서서 이름을 알려주기 전에는 잠그지 않는다 — 잠그면 도구를 전부 잃는다.
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
  const { auth, authKnown, loggingIn, loginNote, login } = useAuth()
  const cliUpdate = useCliUpdate(status.session?.cliVersion ?? null)
  const { state, launch: fanOut, openOne, closeOne } = useDeck()
  const [projectKnown, setProjectKnown] = useState(false)
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))

  // 세션이 알려준 도구 이름을 기억해 둔다 — 다음 세션을 잠글 때 이 이름들이 필요하다
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
    loggedIn: auth?.loggedIn === true,
    hasProject: project?.path != null,
    setupDone: settings.setupDone,
  })

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--zt-text', TEXT)
    root.style.setProperty('--zt-on-primary', GROUND)
    root.style.setProperty('color', TEXT)
  }, [])

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
      .catch((cause: unknown) => console.error('프로젝트 복원 실패', cause))
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
      .catch((cause: unknown) => console.error('프로젝트를 고르지 못했다', cause))
  }

  return (
    <>
      <TileDeck
        state={state}
        sessions={children}
        viewport={viewport}
        nowMs={nowMs}
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
              onStart={() => update({ setupDone: true })}
              canStart={auth?.loggedIn === true && project?.path != null}
              loggingIn={loggingIn}
              loginNote={loginNote}
            />
          ) : (
          <ConversationPane
            turns={conv.turns}
            status={conv.status}
            statusState={status}
            permission={conv.permission}
            nowMs={nowMs}
            permissionMode={settings.permissionMode}
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
            roster={roster(status.session?.agents ?? [], children)}
            fleet={children}
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
              <TeamSidebar
                members={team(defs, status.session?.agents ?? [], roster(status.session?.agents ?? [], children))}
                sessionKnown={status.session !== null}
                canWrite
                note={teamNote}
                onHire={hire}
                onPick={setOpenAgentId}
                onAddress={setAddressee}
              />
            }
          />
          )
        }
      />
      <Titlebar>
        {settings.setupDone && (
          <Button
            variant="quiet"
            size="bare"
            onClick={() => update({ setupDone: false })}
            className="text-[11px]"
            title="계정·프로젝트·권한 모드를 다시 고릅니다"
          >
            설정
          </Button>
        )}
        <ProjectPicker />
      </Titlebar>
    </>
  )
}
