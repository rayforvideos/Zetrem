import { useEffect, useRef, useState } from 'react'
import { chatId, renamed } from '@/entities/conversation'
import type { ChatSummary, Transcript } from '@/entities/conversation'
import { troubleLine } from '@/shared/lib/ask/ask'
import { chatSwitch } from './chat-switch/chat-switch'
import { comingBackTo } from './coming-back/coming-back'
import { mayRestore } from './restore-guard/restore-guard'
import { chatSessions } from '../session/chat-sessions/chat-sessions'
import type { ChatSession } from '../session/chat-sessions/chat-session/chat-session.types'
import { t } from '@lingui/core/macro'

type Chats = {
  chats: ChatSummary[]
  openId: string | null
  session: ChatSession | null
  ready: boolean
  open(id: string): void
  start(): void
  remove(id: string): void
  rename(id: string, wanted: string): void
  file(id: string, folder: string): void
  fileMany(ids: string[], folder: string): void
}

function freshId(): string {
  return chatId(Date.now(), Math.random().toString(36).slice(2, 8))
}

export function useTranscript(project: string | null): Chats {
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const loadedFor = useRef<string | null>(null)
  const openTicket = useRef(0)
  const shown = useRef(project)
  shown.current = project

  // The invariant this hook owes the screen: every path that sets openId opens
  // the chat's session first, so a ready hook with a project and an open chat
  // always has one. useAgent.send() on a null session runs nothing, and the
  // composer would clear into silence.
  const session = openId === null || project === null ? null : chatSessions.find(openId)

  async function refresh(): Promise<ChatSummary[]> {
    if (project === null) return []
    const found = await window.desk.listChats(project).catch((cause: unknown) => {
      session?.stores.conversation.system(troubleLine(t`Could not list your saved chats`, cause))
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
    // The chat on screen belongs to the project that is being left; write it
    // back there, then let its session go if there is nothing left running in
    // it, before this hook starts reading the new project.
    const left = openId
    if (left !== null) {
      chatSessions.find(left)?.keep()
      chatSessions.release(left)
    }
    loadedFor.current = null
    refresh()
      .then(async (found) => {
        if (!alive) return
        const wanted = chatSessions.lastOpened(project)
        const back = comingBackTo(
          found,
          wanted,
          wanted !== null && chatSessions.find(wanted) !== null,
        )
        if (back === null) {
          // Nothing saved here yet. The chat still needs its session now: the
          // first message runs on the session, not on the id.
          const id = freshId()
          chatSessions.open(id, project)
          chatSessions.opened(id, project)
          setOpenId(id)
          return
        }
        const saved = await window.desk.readTranscript(project, back).catch(() => null)
        if (!alive) return
        const s = chatSessions.open(back, project)
        if (
          saved !== null &&
          mayRestore({ running: s.running(), turnCount: s.stores.conversation.get().turns.length })
        ) {
          s.restore(saved)
        }
        chatSessions.opened(back, project)
        setOpenId(back)
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

  // A chat is only in the list once it is on disk, and it is only written when
  // one of its turns settles — in a chat nobody is looking at, too. Without
  // this the sidebar never hears about a chat started here, so it can never
  // show what that chat is doing either.
  useEffect(() => {
    if (project === null) return
    return chatSessions.onSaved((_chatId, into) => {
      if (into === project) void refresh()
    })
  }, [project])

  function open(id: string): void {
    if (project === null || chatSwitch(id, openId) === 'return') return
    const prev = openId
    const ticket = ++openTicket.current
    const s = chatSessions.open(id, project)
    chatSessions.opened(id, project)
    setOpenId(id)
    if (prev !== null) {
      chatSessions.find(prev)?.keep()
      chatSessions.release(prev)
    }
    if (s.running() || s.stores.conversation.get().turns.length > 0) {
      setReady(true)
      return
    }
    setReady(false)
    void window.desk
      .readTranscript(project, id)
      .then((saved) => {
        if (saved === null || openTicket.current !== ticket) return
        if (
          mayRestore({ running: s.running(), turnCount: s.stores.conversation.get().turns.length })
        ) {
          s.restore(saved)
        }
      })
      .catch((cause: unknown) => {
        if (openTicket.current !== ticket) return
        s.stores.conversation.system(troubleLine(t`Could not open that chat`, cause))
      })
      .finally(() => {
        if (openTicket.current === ticket) setReady(true)
      })
  }

  function start(): void {
    if (project === null) return
    const id = freshId()
    chatSessions.open(id, project)
    chatSessions.opened(id, project)
    const prev = openId
    setOpenId(id)
    if (prev !== null) {
      chatSessions.find(prev)?.keep()
      chatSessions.release(prev)
    }
  }

  function remove(id: string): void {
    if (project === null) return
    // Keeps, stops and drops the session before the transcript on disk goes,
    // or a still-running reply would try to write into a chat that is gone.
    chatSessions.forget(id)
    void window.desk
      .forgetTranscript(project, id)
      .then(() => refresh())
      .catch((cause: unknown) => {
        session?.stores.conversation.system(troubleLine(t`Could not forget that chat`, cause))
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
        session?.stores.conversation.system(troubleLine(trouble, cause))
      })
  }

  function rename(id: string, wanted: string): void {
    if (project === null) return
    const next = renamed(wanted)
    if (next === null) return
    const target = chatSessions.find(id)
    if (target !== null) target.meta.title = next
    amend(id, { title: next }, t`Could not rename that chat`)
  }

  function file(id: string, folder: string): void {
    if (project === null) return
    const wanted = folder.trim()
    const target = chatSessions.find(id)
    if (target !== null) target.meta.folder = wanted
    amend(id, { folder: wanted }, t`Could not file that chat`)
  }

  function fileMany(ids: string[], folder: string): void {
    if (project === null || ids.length === 0) return
    const wanted = folder.trim()
    for (const id of ids) {
      const target = chatSessions.find(id)
      if (target !== null) target.meta.folder = wanted
    }
    void Promise.all(
      ids.map(async (id) => {
        const saved = await window.desk.readTranscript(project, id)
        if (saved === null) return
        await window.desk.writeTranscript(project, { ...saved, folder: wanted })
      }),
    )
      .then(() => refresh())
      .catch((cause: unknown) => {
        session?.stores.conversation.system(troubleLine(t`Could not file that chat`, cause))
      })
  }

  return {
    chats,
    openId,
    session,
    ready,
    open,
    start,
    remove,
    rename,
    file,
    fileMany,
  }
}
