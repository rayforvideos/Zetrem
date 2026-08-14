import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  parseClaudeLine,
  permissionAlwaysResult,
  permissionResult,
  sessionStore,
  statusStore,
} from '@/entities/agent-session'
import type { AgentSession, RunConfig, StatusState } from '@/entities/agent-session'
import { applyAgentEvent } from './agent-events'
import { conversation } from './conversation'
import type { ConversationState } from './conversation'

/** 3층 경과 시간이 흐르게 하는 갱신 주기 */
const CLOCK_MS = 1000

type Agent = {
  conversation: ConversationState
  /** 서브에이전트 타일들. 대화 판 옆에 갈라져 선다 */
  children: AgentSession[]
  /** 지속하는 계기 값 — 컨텍스트·비용·한도·MCP. 상태줄이 그린다 (다음 과업) */
  status: StatusState
  nowMs: number
  /** 사람이 친 말을 보낸다. 프로세스가 없으면 여기서 띄운다 */
  send(text: string): void
  /** 올라온 권한 질문에 답한다. always 는 이 세션에서 다시 묻지 않기 */
  decide(allow: boolean, always?: boolean): void
  /** 지금 도는 턴을 멈춘다 */
  stop(): void
}

/**
 * Claude Code 를 뒤에서 굴리고, 그 흐름을 우리 UI 의 상태로 옮긴다.
 *
 * 사람이 보는 것은 CLI 의 TUI 가 아니다 — 프로세스는 stream-json 으로 말하고, 여기서
 * 대화(차례·도구 활동)와 자식 타일로 번역한다. 그래서 화면의 문법은 전부 이 앱의 것이다.
 */
export function useAgent(config: Omit<RunConfig, 'persona'>): Agent {
  // 사람이 첫 화면에서 고른 것 — spawn 순간에 읽는다 (대화 중 바꿔도 다음 세션부터 적용)
  const configRef = useRef(config)
  configRef.current = config
  const conv = useSyncExternalStore(conversation.subscribe, conversation.get, conversation.get)
  const children = useSyncExternalStore(sessionStore.subscribe, sessionStore.get, sessionStore.get)
  const status = useSyncExternalStore(statusStore.subscribe, statusStore.get, statusStore.get)
  const [nowMs, setNowMs] = useState(() => Date.now())

  /** 살아 있는 프로세스의 id. 없으면 다음 말을 보낼 때 띄운다 */
  const hostId = useRef<string | null>(null)
  /** 답을 기다리는 권한 질문들. 사람에게는 한 번에 하나만 올린다 */
  const asks = useRef<{ requestId: string; toolName: string; input: unknown }[]>([])
  /** 살아 있는 자식들 — tool_use id 로 tile id 를 찾는다 */
  const childIds = useRef(new Set<string>())

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), CLOCK_MS)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const unsubscribe = window.desk.onAgentEvent((event) => {
      if (event.id !== hostId.current) return

      if (event.kind === 'exit') {
        hostId.current = null
        // 프로세스가 죽으면 흐르던 초안에는 확정본이 영영 오지 않는다 — 여기까지
        // 도착한 말은 사람이 이미 읽은 것이니 확정본으로 앉히고 커서만 거둔다
        conversation.settleDraft()
        conversation.setStatus('done')
        conversation.setPermission(null)
        for (const childId of childIds.current) sessionStore.patch(childId, { status: 'done' })
        childIds.current.clear()
        return
      }
      if (event.kind === 'workspace') return

      // 이벤트 하나를 대화·계기·자식 타일에 반영하는 로직은 훅 밖(agent-events.ts)에
      // 산다 — 이 훅은 그 로직을 부를 배선(구독·ref·IPC·시계)만 쥔다
      const refs = {
        asks: asks.current,
        childIds: childIds.current,
      }
      for (const turn of parseClaudeLine(event.line)) {
        applyAgentEvent(turn, refs)
      }
    })
    return () => {
      unsubscribe()
      if (hostId.current) window.desk.stopAgent(hostId.current)
    }
  }, [])

  const send = useCallback((text: string) => {
    conversation.say('user', text)
    conversation.setStatus('working')
    if (hostId.current) {
      window.desk.sendToAgent(hostId.current, text)
      return
    }
    // 첫 말이 프로세스를 띄운다 — 사람은 "실행" 을 따로 누르지 않는다.
    // 여기서 열리는 것은 늘 **새 세션**이다 (첫 실행이거나, 앞 프로세스가 죽거나
    // 멈춘 뒤다). 계기를 놓지 않으면 지난 세션의 비용·컨텍스트·한도·훅이 새 세션의
    // 것으로 읽힌다 — 특히 비용은 누적이라 새 세션의 첫 result 가 차액을 0 으로 재고
    // 턴 결산 줄에서 $ 가 말없이 빠진다. 대화(스크롤백)는 사람의 것이라 그대로 둔다
    statusStore.reset()
    const id = `agent-${Date.now()}`
    hostId.current = id
    void window.desk.startAgent(id, text, { ...configRef.current, persona: '' })
  }, [])

  const decide = useCallback((allow: boolean, always = false) => {
    const current = asks.current.shift()
    const id = hostId.current
    if (!current || !id) return
    window.desk.respondPermission(
      id,
      current.requestId,
      allow && always
        ? permissionAlwaysResult(current.toolName, current.input)
        : permissionResult(allow, current.input),
    )
    const next = asks.current[0]
    if (next) {
      conversation.setPermission({
        requestId: next.requestId,
        toolName: next.toolName,
        line: `${next.toolName} …`,
      })
      return
    }
    conversation.setPermission(null)
    conversation.setStatus('working')
  }, [])

  const stop = useCallback(() => {
    if (hostId.current) window.desk.stopAgent(hostId.current)
  }, [])

  return { conversation: conv, children, status, nowMs, send, decide, stop }
}
