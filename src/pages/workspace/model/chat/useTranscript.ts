import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { statusStore } from '@/entities/agent-session'
import { chatId, packTranscript, renamed } from '@/entities/conversation'
import type { ChatSpend, ChatSummary, Transcript } from '@/entities/conversation'
import { conversation } from './conversation/conversation'
import { troubleLine } from '@/shared/lib/ask/ask'
import { maySave, mustKeepOnLeave, threadLearned, threadToSave } from './may-save/may-save'
import { stampOf } from './save-stamp/save-stamp'
import { t } from '@lingui/core/macro'

type Chats = {
  chats: ChatSummary[]
  openId: string | null
  resumeId: string | null
  ready: boolean
  open(id: string): void
  start(): void
  // The next message begins a new session: nothing older is resumed.
  detach(): void
  remove(id: string): void
  rename(id: string, wanted: string): void
  file(id: string, folder: string): void
  fileMany(ids: string[], folder: string): void
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
  const opened = useRef<ChatSpend | null>(null)
  const titled = useRef<string | null>(null)
  // The autosave rewrites the whole chat, so the title and folder have to be
  // held here too, or every save would quietly drop them.
  const filed = useRef('')
  const toldSaveTrouble = useRef(false)
  const loadedFor = useRef<string | null>(null)
  const openTicket = useRef(0)
  const shown = useRef(project)
  shown.current = project
  // For the unmount, which sees no render: the chat that was open and its thread.
  const leaving = useRef({ openId, thread: null as string | null })

  const turns = conv.turns
  const thread = threadToSave({
    liveSessionId: status.session?.id ?? null,
    probed: status.probed,
    resumeId,
  })
  leaving.current = { openId, thread }

  // The live session's id is kept once a real run reports it: a reset (another
  // screen, a rebuilt one) empties the status store, and the next message must
  // still resume the conversation it was part of.
  const learned = threadLearned({
    liveSessionId: status.session?.id ?? null,
    probed: status.probed,
  })
  useEffect(() => {
    if (learned !== null) setResumeId(learned)
  }, [learned])

  // The whole screen can be torn down with a chat still open (a language
  // change rebuilds it): that chat is written back on the way out.
  useEffect(() => {
    return () => {
      const into = loadedFor.current
      const { openId: id, thread: session } = leaving.current
      const turnCount = conversation.get().turns.length
      if (!mustKeepOnLeave({ project: into, loadedFor: into, openId: id, turnCount })) return
      if (into === null || id === null) return
      void window.desk.writeTranscript(into, pack(id, session)).catch(() => undefined)
    }
  }, [])

  async function refresh(): Promise<ChatSummary[]> {
    if (project === null) return []
    const found = await window.desk.listChats(project).catch((cause: unknown) => {
      conversation.system(troubleLine(t`Could not list your saved chats`, cause))
      return null
    })
    if (found === null) return []
    // The list may come back after the screen moved to another project.
    if (shown.current === project) setChats(found)
    return found
  }

  useEffect(() => {
    if (project === null) {
      setReady(false)
      return
    }
    let alive = true
    setReady(false)
    openTicket.current += 1
    keepFor(loadedFor.current)
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
        titled.current = saved !== null && saved.title.length > 0 ? saved.title : null
        filed.current = saved?.folder ?? ''
        setResumeId(saved?.sessionId ?? null)
        opened.current = saved?.spend ?? null
        if (saved?.spend != null) statusStore.restoreChat(saved.spend)
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

  function pack(id: string, sessionId: string | null): Transcript {
    const live = conversation.get().turns
    const spent = statusStore.get()
    return packTranscript(
      live,
      {
        id,
        sessionId,
        savedAtMs: Date.now(),
        title: titled.current ?? undefined,
        folder: filed.current,
      },
      spent.cost.turns > 0
        ? {
            usd: spent.cost.usd,
            turns: spent.cost.turns,
            tokensOut: spent.cost.tokens.out,
            tokensIn: spent.cost.tokens.in,
            cacheRead: spent.cost.tokens.cacheRead,
            cacheWrite: spent.cost.tokens.cacheCreate,
            durationMs: spent.cost.durationMs,
            contextUsed: spent.context.used,
            contextWindow: spent.context.window,
          }
        : opened.current,
    )
  }

  function write(into: string, packed: Transcript): void {
    const stamp = stampOf(packed)
    if (stamp === lastSaved.current) return
    lastSaved.current = stamp
    void window.desk
      .writeTranscript(into, packed)
      .then(() => {
        toldSaveTrouble.current = false
        return refresh()
      })
      .catch((cause: unknown) => {
        lastSaved.current = ''
        if (toldSaveTrouble.current) return
        toldSaveTrouble.current = true
        conversation.system(troubleLine(t`This chat is not being saved`, cause))
      })
  }

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
    write(project, pack(openId, thread))
  }, [ready, project, openId, turns, conv.status, thread])

  // Whatever is on screen goes to disk before it is replaced. The autosave
  // waits for a turn to settle; this does not, or a chat left mid-reply would
  // vanish. It reads the stores directly: the caller may have just changed them.
  function keep(): void {
    keepFor(loadedFor.current, project)
  }

  // On a project switch the prop already names the new project; the turns on
  // screen still belong to the one they were loaded for, so that is where they go.
  function keepFor(into: string | null, owner: string | null = into): void {
    const turnCount = conversation.get().turns.length
    if (!mustKeepOnLeave({ project: owner, loadedFor: into, openId, turnCount })) return
    if (into === null || openId === null) return
    write(into, pack(openId, thread))
  }

  function letGo(): number {
    keep()
    lastSaved.current = ''
    opened.current = null
    titled.current = null
    filed.current = ''
    statusStore.reset()
    conversation.reset()
    return ++openTicket.current
  }

  function open(id: string): void {
    if (project === null || id === openId) return
    const ticket = letGo()
    setOpenId(id)
    setResumeId(null)
    setReady(false)
    void window.desk
      .readTranscript(project, id)
      .then((saved) => {
        if (saved === null || openTicket.current !== ticket) return
        setResumeId(saved.sessionId)
        titled.current = saved.title.length > 0 ? saved.title : null
        filed.current = saved.folder
        opened.current = saved.spend ?? null
        if (saved.spend != null) statusStore.restoreChat(saved.spend)
        conversation.restore(saved.turns)
      })
      .catch((cause: unknown) => {
        if (openTicket.current !== ticket) return
        conversation.system(troubleLine(t`Could not open that chat`, cause))
      })
      .finally(() => {
        if (openTicket.current === ticket) setReady(true)
      })
  }

  function detach(): void {
    setResumeId(null)
  }

  function start(): void {
    letGo()
    setOpenId(freshId())
    setResumeId(null)
  }

  function remove(id: string): void {
    if (project === null) return
    void window.desk
      .forgetTranscript(project, id)
      .then(() => refresh())
      .catch((cause: unknown) => {
        conversation.system(troubleLine(t`Could not forget that chat`, cause))
      })
    if (id === openId) start()
  }

  function amend(id: string, patch: Partial<Transcript>, trouble: string): void {
    if (project === null) return
    void window.desk
      .readTranscript(project, id)
      .then((saved) => {
        if (saved === null) return
        return window.desk.writeTranscript(project, { ...saved, ...patch })
      })
      .then(() => refresh())
      .catch((cause: unknown) => {
        conversation.system(troubleLine(trouble, cause))
      })
  }

  function rename(id: string, wanted: string): void {
    if (project === null) return
    const next = renamed(wanted)
    if (next === null) return
    if (id === openId) titled.current = next
    amend(id, { title: next }, t`Could not rename that chat`)
  }

  function file(id: string, folder: string): void {
    if (project === null) return
    const wanted = folder.trim()
    if (id === openId) filed.current = wanted
    amend(id, { folder: wanted }, t`Could not file that chat`)
  }

  function fileMany(ids: string[], folder: string): void {
    if (project === null || ids.length === 0) return
    const wanted = folder.trim()
    if (openId !== null && ids.includes(openId)) filed.current = wanted
    void Promise.all(
      ids.map(async (id) => {
        const saved = await window.desk.readTranscript(project, id)
        if (saved === null) return
        await window.desk.writeTranscript(project, { ...saved, folder: wanted })
      }),
    )
      .then(() => refresh())
      .catch((cause: unknown) => {
        conversation.system(troubleLine(t`Could not file that chat`, cause))
      })
  }

  return {
    chats,
    openId,
    resumeId: thread,
    ready,
    open,
    start,
    detach,
    remove,
    rename,
    file,
    fileMany,
  }
}
