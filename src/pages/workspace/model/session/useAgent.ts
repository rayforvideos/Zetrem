import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { sessionStore, statusStore } from '@/entities/agent-session'
import { addressed } from '@/entities/teammate'
import { parseClaudeLine, permissionAlwaysResult, permissionResult } from '@/entities/claude-cli'
import type { AgentSession, StatusState } from '@/entities/agent-session'
import type { ModelChoice, RunConfig } from '@/entities/claude-cli'
import { applyAgentEvent } from './agent-events/agent-events'
import type { Sent } from './agent-events/agent-events.types'
import { advancePermission } from '../chat/conversation/advance-permission'
import { conversation } from '../chat/conversation/conversation'
import { sentOf, withPaths } from '@/entities/attachment'
import type { Attached } from '@/entities/attachment'
import { reasonOf } from '@/shared/lib/failure/failure'
import { shouldRelaunch } from './relaunch/relaunch'
import { beginSession, closeSession } from './session-bookkeeping/session-bookkeeping'
import { settled } from './settle/settle'
import { afterYouStopped } from './asked-to-stop/asked-to-stop'
import type { Attempt } from './relaunch/relaunch.types'
import type { ConversationState } from '../chat/conversation/conversation.types'
import { t } from '@lingui/core/macro'

const CLOCK_MS = 1000

type Agent = {
  running: boolean
  conversation: ConversationState
  children: AgentSession[]
  status: StatusState
  nowMs: number
  send(text: string, to?: string | null, files?: Attached[]): void
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
  const conv = useSyncExternalStore(conversation.subscribe, conversation.get, conversation.get)
  const children = useSyncExternalStore(sessionStore.subscribe, sessionStore.get, sessionStore.get)
  const status = useSyncExternalStore(statusStore.subscribe, statusStore.get, statusStore.get)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [running, setRunning] = useState(false)

  const hostId = useRef<string | null>(null)
  const asks = useRef<
    { requestId: string; toolName: string; line: string; detail: string; input: unknown }[]
  >([])
  const childIds = useRef(new Set<string>())
  const sends = useRef(new Map<string, Sent>())
  const attempt = useRef<Attempt | null>(null)
  const stopping = useRef(false)
  const refused = useRef(onModelRefused)

  // Written after commit, not during render: a render React throws away must
  // not leave its config behind for launch() to hand the subprocess.
  useEffect(() => {
    configRef.current = config
    refused.current = onModelRefused
  })

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
        const stopped = stopping.current
        hostId.current = null
        setRunning(false)
        stopping.current = false
        const failed = attempt.current
        attempt.current = null
        if (failed !== null && shouldRelaunch(failed, event.code)) {
          conversation.system(t`Could not pick that conversation back up. Starting a new one.`)
          launch(failed.prompt, null, failed.files)
          return
        }
        closeSession({
          reason: event.reason,
          stopped,
          asks: asks.current,
          childIds: childIds.current,
        })
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
        applyAgentEvent(afterYouStopped(turn, stopping.current), refs)
      }
    })
    return () => {
      unsubscribe()
      if (hostId.current) {
        // The screen is being rebuilt (a language change does this) and the
        // process cannot follow it across; the next message resumes the thread.
        conversation.settleDraft()
        conversation.system(
          t`The screen was rebuilt, so this session paused. Your next message picks it back up.`,
        )
        window.desk.stopAgent(hostId.current)
      }
    }
  }, [])

  function launch(text: string, resume: string | null, files: Attached[] = []): void {
    beginSession({
      resumed: resume !== null,
      asks: asks.current,
      sends: sends.current,
      childIds: childIds.current,
    })
    const id = `agent-${Date.now()}`
    hostId.current = id
    stopping.current = false
    setRunning(true)
    stopping.current = false
    attempt.current = { prompt: text, files, resumed: resume !== null, spoke: false }
    void window.desk
      .startAgent(id, text, { ...configRef.current, persona: '', resume }, files)
      .catch((cause: unknown) => {
        if (hostId.current !== id) return
        hostId.current = null
        setRunning(false)
        attempt.current = null
        conversation.system(`Could not start Claude Code: ${reasonOf(cause)}`)
        conversation.setStatus('done')
        conversation.setTrouble(true)
      })
  }

  function send(text: string, to: string | null = null, files: Attached[] = []): void {
    conversation.say('user', text, to ?? undefined, sentOf(files))
    conversation.setStatus('working')
    const dressed = withPaths(addressed(text, to), files)
    // A stopped session is on its way out: this message starts a fresh one.
    if (hostId.current && !stopping.current) {
      window.desk.sendToAgent(hostId.current, dressed, files)
      return
    }
    launch(dressed, configRef.current.resume ?? null, files)
  }

  function restart(): void {
    reset()
    conversation.system(
      t`Session stopped. The next message starts a new one with your team as it is now.`,
    )
  }

  function reset(): void {
    const id = hostId.current
    hostId.current = null
    setRunning(false)
    attempt.current = null
    asks.current.length = 0
    childIds.current.clear()
    sends.current.clear()
    sessionStore.clear()
    statusStore.reset()
    conversation.settleDraft()
    conversation.setStatus('done')
    conversation.setPermission(null)
    conversation.setTrouble(false)
    // stopAgent kills the CLI and every background command it ran; the exit
    // event finds hostId already null, so closeSession never clears these.
    conversation.clearChores()
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
    advancePermission(asks.current)
  }

  function stop(): void {
    attempt.current = null
    stopping.current = true
    if (hostId.current) window.desk.stopAgent(hostId.current)
  }

  return {
    running,
    conversation: conv,
    children,
    status,
    nowMs,
    send,
    decide,
    stop,
    reset,
    restart,
  }
}
