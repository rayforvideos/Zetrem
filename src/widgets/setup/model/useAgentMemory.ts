import { useEffect, useState } from 'react'
import { i18n } from '@lingui/core'
import { t } from '@lingui/core/macro'
import type { MemoryEntry, MemoryNote } from '@/entities/agent-memory/model/note'

type Rendering = { description: string; body: string }

type Memory = {
  entries: MemoryEntry[] | null
  openId: string | null
  note: MemoryNote | null
  translated: Rendering | null
  busy: boolean
  said: string
  open(id: string): void
  close(): void
  editBody(body: string): void
  editDescription(description: string): void
  save(): void
  remove(): void
  translate(): void
  showOriginal(): void
  translating: boolean
}

// The agent keeps its own memory as files; this pane lets the person audit
// them. Everything is re-read on open so a running session's writes show up.
export function useAgentMemory(active: boolean): Memory {
  const [entries, setEntries] = useState<MemoryEntry[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [note, setNote] = useState<MemoryNote | null>(null)
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState('')
  const [translated, setTranslated] = useState<Rendering | null>(null)
  const [translating, setTranslating] = useState(false)
  const [kept, setKept] = useState(new Map<string, Rendering>())

  useEffect(() => {
    if (!active) {
      setEntries(null)
      setOpenId(null)
      setNote(null)
      setSaid('')
      return
    }
    void window.desk
      .listMemory()
      .catch(() => null)
      .then((listed) => {
        if (listed === null || !listed.ok) {
          setEntries([])
          setSaid(
            listed === null || listed.why.code !== 'refused'
              ? t`Could not read the memory folder`
              : '',
          )
          return
        }
        setEntries(listed.value)
      })
  }, [active])

  function refresh(): void {
    void window.desk
      .listMemory()
      .catch(() => null)
      .then((listed) => {
        if (listed?.ok) setEntries(listed.value)
      })
  }

  function open(id: string): void {
    setBusy(true)
    setSaid('')
    void window.desk
      .readMemory(id)
      .catch(() => null)
      .then((read) => {
        setBusy(false)
        if (read === null || !read.ok) {
          setSaid(t`Could not read that memory`)
          refresh()
          return
        }
        setOpenId(id)
        setNote(read.value)
        setTranslated(null)
      })
  }

  function close(): void {
    setOpenId(null)
    setNote(null)
    setSaid('')
    setTranslated(null)
  }

  function editBody(body: string): void {
    setNote((kept) => (kept === null ? kept : { ...kept, body }))
  }

  function editDescription(description: string): void {
    setNote((kept) => (kept === null ? kept : { ...kept, description }))
  }

  function save(): void {
    if (openId === null || note === null) return
    setBusy(true)
    void window.desk
      .writeMemory(openId, note.body, note.description)
      .catch(() => null)
      .then((put) => {
        setBusy(false)
        if (put === null || !put.ok) {
          setSaid(t`Could not save that memory`)
          return
        }
        setSaid(t`Saved`)
        refresh()
      })
  }

  function remove(): void {
    if (openId === null) return
    setBusy(true)
    void window.desk
      .removeMemory(openId)
      .catch(() => null)
      .then((gone) => {
        setBusy(false)
        if (gone === null || !gone.ok) {
          setSaid(t`Could not remove that memory`)
          return
        }
        close()
        refresh()
      })
  }

  function translate(): void {
    if (openId === null) return
    const remembered = kept.get(openId)
    if (remembered !== undefined) {
      setTranslated(remembered)
      return
    }
    setBusy(true)
    setTranslating(true)
    setSaid('')
    const id = openId
    void window.desk
      .translateMemory(id, i18n.locale)
      .catch(() => null)
      .then((got) => {
        setBusy(false)
        setTranslating(false)
        if (got === null || !got.ok) {
          setSaid(t`Could not translate that memory`)
          return
        }
        setKept((held) => new Map(held).set(id, got.value))
        setTranslated(got.value)
      })
  }

  function showOriginal(): void {
    setTranslated(null)
  }

  return {
    entries,
    openId,
    note,
    translated,
    busy,
    said,
    open,
    close,
    editBody,
    editDescription,
    save,
    remove,
    translate,
    showOriginal,
    translating,
  }
}
