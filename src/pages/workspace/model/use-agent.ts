import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  ORCHESTRATOR_PROMPT,
  parseClaudeLine,
  permissionAlwaysResult,
  permissionResult,
  sessionStore,
  statusStore,
} from '@/entities/agent-session'
import type { AgentSession, RunConfig, StatusState } from '@/entities/agent-session'
import { applyAgentEvent } from './agent-events/agent-events'
import { conversation } from './conversation/conversation'
import type { ConversationState } from './conversation/conversation.types'

const CLOCK_MS = 1000

type Agent = {
  conversation: ConversationState
  children: AgentSession[]
  status: StatusState
  nowMs: number
  send(text: string): void
  decide(allow: boolean, always?: boolean): void
  stop(): void
}

export function useAgent(config: Omit<RunConfig, 'persona'>): Agent {
  const configRef = useRef(config)
  configRef.current = config
  const conv = useSyncExternalStore(conversation.subscribe, conversation.get, conversation.get)
  const children = useSyncExternalStore(sessionStore.subscribe, sessionStore.get, sessionStore.get)
  const status = useSyncExternalStore(statusStore.subscribe, statusStore.get, statusStore.get)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const hostId = useRef<string | null>(null)
  const asks = useRef<{ requestId: string; toolName: string; input: unknown }[]>([])
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
        conversation.settleDraft()
        conversation.setStatus('done')
        conversation.setPermission(null)
        for (const childId of childIds.current) sessionStore.patch(childId, { status: 'done' })
        childIds.current.clear()
        return
      }
      if (event.kind === 'workspace') return

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
    statusStore.reset()
    const id = `agent-${Date.now()}`
    hostId.current = id
    void window.desk.startAgent(id, text, { ...configRef.current, persona: ORCHESTRATOR_PROMPT })
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
