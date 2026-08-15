import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  addressed,
  parseClaudeLine,
  permissionAlwaysResult,
  permissionResult,
  sessionStore,
  statusStore,
} from '@/entities/agent-session'
import type { AgentSession, ModelChoice, RunConfig, StatusState } from '@/entities/agent-session'
import { applyAgentEvent } from './agent-events/agent-events'
import { conversation } from './conversation/conversation'
import { reasonOf } from '@/shared/lib/failure/failure'
import { shouldRelaunch } from './relaunch/relaunch'
import { settled } from './settle/settle'
import type { Attempt } from './relaunch/relaunch.types'
import type { ConversationState } from './conversation/conversation.types'

const CLOCK_MS = 1000

type Agent = {
  conversation: ConversationState
  children: AgentSession[]
  status: StatusState
  nowMs: number
  send(text: string, to?: string | null): void
  decide(allow: boolean, always?: boolean): void
  stop(): void
  reset(): void
  restart(): void
}

export function useAgent(
  config: Omit<RunConfig, 'persona'>,
  onModelRefused: (model: ModelChoice) => void,
): Agent {
  const configRef = useRef(config)
  configRef.current = config
  const conv = useSyncExternalStore(conversation.subscribe, conversation.get, conversation.get)
  const children = useSyncExternalStore(sessionStore.subscribe, sessionStore.get, sessionStore.get)
  const status = useSyncExternalStore(statusStore.subscribe, statusStore.get, statusStore.get)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const hostId = useRef<string | null>(null)
  const asks = useRef<
    { requestId: string; toolName: string; line: string; detail: string; input: unknown }[]
  >([])
  const childIds = useRef(new Set<string>())
  const sends = useRef(new Map<string, string>())
  const attempt = useRef<Attempt | null>(null)
  const refused = useRef(onModelRefused)
  refused.current = onModelRefused

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), CLOCK_MS)
    return () => clearInterval(timer)
  }, [])

  const convStatus = conv.status
  useEffect(() => {
    const at = { nowMs, parentWorking: convStatus === 'working' }
    for (const id of settled(children, at)) sessionStore.patch(id, { status: 'done' })
  }, [children, nowMs, convStatus])

  useEffect(() => {
    const unsubscribe = window.desk.onAgentEvent((event) => {
      if (event.id !== hostId.current) return

      if (event.kind === 'exit') {
        hostId.current = null
        const failed = attempt.current
        attempt.current = null
        if (shouldRelaunch(failed, event.code)) {
          conversation.system('Could not pick that conversation back up. Starting a new one.')
          launch(failed!.prompt, null)
          return
        }
        conversation.settleDraft()
        if (event.reason !== null) conversation.system(event.reason)
        conversation.setStatus('done')
        conversation.setPermission(null)
        conversation.clearChores()
        for (const childId of childIds.current) sessionStore.patch(childId, { status: 'done' })
        childIds.current.clear()
        return
      }
      if (event.kind === 'workspace') return
      if (attempt.current !== null) attempt.current.spoke = true

      const refs = {
        asks: asks.current,
        childIds: childIds.current,
        sends: sends.current,
        onModelRefused: refused.current,
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

  function launch(text: string, resume: string | null): void {
    statusStore.reset()
    sessionStore.clear()
    childIds.current.clear()
    sends.current.clear()
    const id = `agent-${Date.now()}`
    hostId.current = id
    attempt.current = { prompt: text, resumed: resume !== null, spoke: false }
    conversation.setStatus('working')
    void window.desk
      .startAgent(id, text, { ...configRef.current, persona: '', resume })
      .catch((cause: unknown) => {
        if (hostId.current !== id) return
        hostId.current = null
        attempt.current = null
        conversation.system(`Could not start Claude Code: ${reasonOf(cause)}`)
        conversation.setStatus('done')
      })
  }

  function send(text: string, to: string | null = null): void {
    conversation.say('user', text, to ?? undefined)
    conversation.setStatus('working')
    const dressed = addressed(text, to)
    if (hostId.current) {
      window.desk.sendToAgent(hostId.current, dressed)
      return
    }
    launch(dressed, configRef.current.resume ?? null)
  }

  function restart(): void {
    reset()
    conversation.system('Session stopped. The next message starts a new one with your team as it is now.')
  }

  function reset(): void {
    const id = hostId.current
    hostId.current = null
    attempt.current = null
    asks.current.length = 0
    childIds.current.clear()
    sends.current.clear()
    sessionStore.clear()
    statusStore.reset()
    conversation.settleDraft()
    conversation.setStatus('done')
    conversation.setPermission(null)
    if (id !== null) window.desk.stopAgent(id)
  }

  function decide(allow: boolean, always = false): void {
    const id = hostId.current
    if (id === null || asks.current.length === 0) return
    const current = asks.current.shift()!
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
        line: next.line,
        detail: next.detail,
      })
      return
    }
    conversation.setPermission(null)
    conversation.setStatus('working')
  }

  function stop(): void {
    attempt.current = null
    if (hostId.current) window.desk.stopAgent(hostId.current)
  }

  return { conversation: conv, children, status, nowMs, send, decide, stop, reset, restart }
}
