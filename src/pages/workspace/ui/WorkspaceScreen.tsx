import { useEffect, useState, useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import { BackdropLayer, backdropStore, restoreBackdrop } from '@/entities/backdrop'
import { sessionStore } from '@/entities/agent-session'
import { pickProject, projectStore, restoreProject } from '@/entities/project'
import { TILE_MIN_DWELL_MS } from '@/shared/config/motion'
import { ConversationPane } from '@/widgets/conversation'
import { SetupPane } from '@/widgets/setup'
import { TileDeck, closingIds, useDeck, visibleIds } from '@/widgets/tile-deck'
import { TITLEBAR_UNIT_RECT, Titlebar } from '@/widgets/titlebar'
import { WORDMARK_SIGNATURE_OPACITY, WORDMARK_SIZE, Wordmark } from '@/shared/ui/wordmark'
import { screenGate } from '../model/screen-gate'
import { useAuth } from '../model/use-auth'
import { useCliUpdate } from '../model/use-cli-update'
import { useSettings } from '../model/use-settings'
import { useGlassTint } from '../model/use-glass-tint'
import { useAgent } from '../model/use-agent'
import { BackdropPicker } from './controls/BackdropPicker'
import { ProjectPicker } from './controls/ProjectPicker'

/** 대화 판이 놓이는 자리의 근사 — 왼쪽 절반. 틴트는 유리 알파가 보증하므로 근사면 된다 */
const TERMINAL_UNIT_RECT = { x: 0.05, y: 0.05, w: 0.45, h: 0.9 }

/**
 * 이 앱의 화면.
 *
 * 첫 판은 대화다 — 사람이 거기에 일을 맡기면 Claude Code 가 뒤에서 돌고, 답과 도구 활동이
 * 우리 문법으로 그려진다. 에이전트가 서브에이전트를 띄우면 그 일이 옆으로 갈라져 나온다.
 * CLI 의 화면은 어디에도 없다.
 */
export function WorkspaceScreen() {
  const { tintFor } = useGlassTint()
  const { settings, loading, update } = useSettings()
  const { conversation: conv, children, status, nowMs, send, decide, stop } = useAgent({
    permissionMode: settings.permissionMode,
    model: settings.model,
  })
  const { auth, authKnown, loggingIn, loginNote, login } = useAuth()
  const cliUpdate = useCliUpdate(status.session?.cliVersion ?? null)
  const { state, launch: fanOut, openOne, closeOne } = useDeck()
  const [projectKnown, setProjectKnown] = useState(false)
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  // 대화 판의 틴트 — 화면에서 가장 큰 판이다
  const terminalTint = tintFor(TERMINAL_UNIT_RECT)
  const project = useSyncExternalStore(projectStore.subscribe, projectStore.get, projectStore.get)
  /**
   * 어느 화면을 열 것인가. 프로젝트가 기억돼 있다는 것만으로는 부족하고
   * (사람이 "이 설정으로 시작" 을 누른 적이 있어야 한다 — 2026-08-13 보고),
   * 아직 모르는 동안에는 어느 쪽도 열지 않는다 (2026-08-14 보고). 규칙은 screen-gate 가 진다
   */
  const gate = screenGate({
    settingsLoaded: !loading,
    authKnown,
    projectKnown,
    loggedIn: auth?.loggedIn === true,
    hasProject: project?.path != null,
    setupDone: settings.setupDone,
  })
  const backdrop = useSyncExternalStore(
    backdropStore.subscribe,
    backdropStore.get,
    backdropStore.get,
  ).backdrop

  /**
   * 유리의 색을 문서 뿌리에도 심는다.
   *
   * Radix(shadcn)는 메뉴·다이얼로그를 body 로 포털한다 — 유리 판 바깥이라 판에 걸어둔
   * `--zt-*` 를 물려받지 못하고, 그러면 shadcn 토큰이 전부 기본색으로 떨어진다.
   * 대화 판의 틴트를 뿌리에 심어 떠 있는 것들도 같은 색을 쓰게 한다.
   */
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--zt-text', terminalTint.text)
    root.style.setProperty('--zt-on-primary', terminalTint.surfaceSolid)
    root.style.setProperty('color', terminalTint.text)
  }, [terminalTint])

  useEffect(() => {
    function onResize(): void {
      setViewport({ w: window.innerWidth, h: window.innerHeight })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // 지난 세션의 배경을 되살린다. 이미 골랐다면(더 빠른 손) 덮지 않는다
  useEffect(() => {
    let cancelled = false
    restoreBackdrop()
      .then((restored) => {
        if (!restored) return
        if (!cancelled && backdropStore.get().backdrop === null) {
          backdropStore.set(restored)
          return
        }
        // 채택되지 않은 복원본은 여기서 놓아준다 — StrictMode 이중 실행과
        // "사용자가 먼저 골랐다" 경합 양쪽에서 blob 이 새는 자리다
        URL.revokeObjectURL(restored.url)
      })
      .catch((cause: unknown) => console.error('배경 복원 실패', cause))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    restoreProject()
      .then((restored) => {
        if (restored && projectStore.get() === null) projectStore.set(restored)
      })
      .catch((cause: unknown) => console.error('프로젝트 복원 실패', cause))
      // 없다는 답도 답이다 — 실패해도 "알았다" 로 쳐야 화면이 영영 기다리지 않는다
      .finally(() => setProjectKnown(true))
  }, [])

  /**
   * 세션은 있는데 격자에 자리가 없는 타일 — 터미널에서 방금 시작된 세션이거나
   * 그 세션이 낳은 서브에이전트다. 첫 타일은 물이 갈라지듯 열리고(launch),
   * 그 뒤로는 격자에 한 장씩 낀다(openOne).
   */
  useEffect(() => {
    const placed = new Set([...visibleIds(state), ...closingIds(state)])
    const fresh = children.filter((session) => session.status !== 'done' && !placed.has(session.id))
    if (fresh.length === 0) return
    if (state.kind === 'solo') fanOut(fresh.map((session) => session.id))
    else for (const session of fresh) openOne(session.id)
  }, [children, state, fanOut, openOne])

  /**
   * 끝난 세션의 타일은 스스로 닫힌다. 몇 초 만에 끝난 자식도 읽을 수 있을 만큼은 산다 —
   * 번쩍이고 사라지는 타일은 없는 것보다 나쁘다 (2026-08-13 화면 녹화)
   */
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
      <BackdropLayer backdrop={backdrop} />
      <TileDeck
        state={state}
        sessions={children}
        tintFor={tintFor}
        viewport={viewport}
        nowMs={nowMs}
        // 터미널은 화면 전체가 글자다 — 다른 타일보다 유리를 두껍게 줘야 배너와 색이 씻기지 않는다
        terminalTint={terminalTint}
        terminal={
          // 셋 중 하나라도 아직 모르는 동안에는 어느 쪽도 열지 않는다. 이름만 조용히
          // 세워두고 기다린다 — 아무것도 없는 판은 고장으로 읽히고, 설정 화면을 미리
          // 그리면 이미 로그인한 사람에게 한 프레임이 거짓말을 한다
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
            onSend={send}
            onDecide={decide}
            onStop={stop}
            onUpdateCli={cliUpdate.start}
            updatingCli={cliUpdate.updating}
          />
          )
        }
      />
      {/* 조작은 타이틀바에 둔다 — 타일 위에 얹으면 터미널의 자리를 빼앗는다 */}
      <Titlebar tint={tintFor(TITLEBAR_UNIT_RECT)}>
        {settings.setupDone && (
          <button
            type="button"
            onClick={() => update({ setupDone: false })}
            className="zt-btn zt-btn--ghost zt-btn--sm"
            title="계정·프로젝트·권한 모드를 다시 고릅니다"
          >
            설정
          </button>
        )}
        <ProjectPicker />
        <BackdropPicker />
      </Titlebar>
    </>
  )
}

