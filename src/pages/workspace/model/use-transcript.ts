import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { statusStore } from '@/entities/agent-session'
import { chatId, packTranscript } from '@/entities/conversation'
import type { ChatSummary } from '@/entities/conversation'
import { conversation } from './conversation/conversation'
import { troubleLine } from '@/shared/lib/ask/ask'
import { maySave } from './may-save/may-save'

type Chats = {
  chats: ChatSummary[]
  openId: string | null
  resumeId: string | null
  ready: boolean
  open(id: string): void
  start(): void
  remove(id: string): void
}

function freshId(): string {
  return chatId(Date.now(), Math.random().toString(36).slice(2, 8))
}

export function useTranscript(project: string | null): Chats {
  const conv = useSyncExternalStore(conversation.subscribe, conversation.get, conversation.get)
  const status = useSyncExternalStore(statusStore.subscribe, statusStore.get, statusStore.get)
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [resumeId, setResumeId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const lastSaved = useRef('')
  const toldSaveTrouble = useRef(false)
  const loadedFor = useRef<string | null>(null)

  const turns = conv.turns
  const liveSessionId = status.session?.id ?? null

  async function refresh(): Promise<ChatSummary[]> {
    if (project === null) return []
    const found = await window.desk.listChats(project).catch((cause: unknown) => {
      conversation.system(troubleLine('Could not list your saved chats', cause))
      return null
    })
    if (found === null) return []
    setChats(found)
    return found
  }

  useEffect(() => {
    if (project === null) {
      setReady(false)
      return
    }
    let alive = true
    setReady(false)
    loadedFor.current = null
    lastSaved.current = ''
    conversation.reset()
    statusStore.reset()
    refresh()
      .then(async (found) => {
        if (!alive) return
        const latest = found[0]
        if (latest === undefined) {
          setOpenId(freshId())
          setResumeId(null)
          return
        }
        const saved = await window.desk.readTranscript(project, latest.id).catch(() => null)
        if (!alive) return
        setOpenId(latest.id)
        setResumeId(saved?.sessionId ?? null)
        if (saved !== null) conversation.restore(saved.turns)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!alive) return
        loadedFor.current = project
        setReady(true)
      })
    return () => {
      alive = false
    }
  }, [project])

  useEffect(() => {
    const allowed = maySave({
      ready,
      project,
      loadedFor: loadedFor.current,
      openId,
      status: conv.status,
      turnCount: turns.length,
    })
    if (!allowed || project === null || openId === null) return
    const packed = packTranscript(turns, {
      id: openId,
      sessionId: liveSessionId ?? resumeId,
      savedAtMs: Date.now(),
    })
    const stamp = `${packed.id}:${packed.sessionId}:${packed.turns.length}:${packed.turns.at(-1)?.text ?? ''}`
    if (stamp === lastSaved.current) return
    lastSaved.current = stamp
    void window.desk
      .writeTranscript(project, packed)
      .then(() => {
        toldSaveTrouble.current = false
        return refresh()
      })
      .catch((cause: unknown) => {
        lastSaved.current = ''
        if (toldSaveTrouble.current) return
        toldSaveTrouble.current = true
        conversation.system(troubleLine('This chat is not being saved', cause))
      })
  }, [ready, project, openId, turns, conv.status, liveSessionId, resumeId])

  function open(id: string): void {
    if (project === null || id === openId) return
    lastSaved.current = ''
    statusStore.reset()
    conversation.reset()
    setOpenId(id)
    setResumeId(null)
    void window.desk
      .readTranscript(project, id)
      .then((saved) => {
        if (saved === null) return
        setResumeId(saved.sessionId)
        conversation.restore(saved.turns)
      })
      .catch((cause: unknown) => {
        conversation.system(troubleLine('Could not open that chat', cause))
      })
  }

  function start(): void {
    lastSaved.current = ''
    statusStore.reset()
    conversation.reset()
    setOpenId(freshId())
    setResumeId(null)
  }

  function remove(id: string): void {
    if (project === null) return
    void window.desk
      .forgetTranscript(project, id)
      .then(() => refresh())
      .catch((cause: unknown) => {
        conversation.system(troubleLine('Could not forget that chat', cause))
      })
    if (id === openId) start()
  }

  return { chats, openId, resumeId: liveSessionId ?? resumeId, ready, open, start, remove }
}
