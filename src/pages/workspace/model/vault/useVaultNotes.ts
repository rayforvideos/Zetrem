import { useCallback, useEffect, useRef, useState } from 'react'
import { GUIDE_ID, unseenSince } from '@/entities/vault'
import type { VaultFolder, VaultListing, VaultNote, VaultNoteSummary } from '@/entities/vault'

const SAVE_AFTER_MS = 800

function newest(notes: VaultNoteSummary[]): VaultNoteSummary | null {
  return notes.reduce<VaultNoteSummary | null>(
    (best, one) => (best === null || one.updatedAtMs > best.updatedAtMs ? one : best),
    null,
  )
}

export function useVaultNotes(active: boolean, idle: boolean) {
  const [folders, setFolders] = useState<VaultFolder[]>([])
  const [notes, setNotes] = useState<VaultNoteSummary[]>([])
  const [open, setOpen] = useState<VaultNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [unseen, setUnseen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [fresh, setFresh] = useState(false)
  const openId = useRef<string | null>(null)
  const onScreen = useRef(active)
  const seenAtMs = useRef(Date.now())
  const writing = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const waiting = useRef<{ id: string; text: string } | null>(null)

  useEffect(() => {
    openId.current = open?.id ?? null
    onScreen.current = active
  })

  const flush = useCallback((): Promise<void> => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
    const job = waiting.current
    waiting.current = null
    if (job === null) return Promise.resolve()
    return window.desk
      .writeVaultNote(job.id, job.text)
      .then(() => undefined)
      .catch(() => undefined)
  }, [])

  const land = useCallback((listing: VaultListing): void => {
    setFolders(listing.folders)
    setNotes(listing.notes)
  }, [])

  const relist = useCallback((): void => {
    setLoading(true)
    void window.desk
      .listVaultNotes()
      .then(async (listing) => {
        land(listing)
        if (!onScreen.current || writing.current) return
        const id = openId.current ?? newest(listing.notes)?.id ?? null
        if (id === null) return
        const note = await window.desk.readVaultNote(id)
        if (note !== null) setOpen(note)
        else if (!listing.notes.some((one) => one.id === id)) setOpen(null)
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [land])

  useEffect(() => {
    seenAtMs.current = Date.now()
    setUnseen(false)
  }, [active])

  useEffect(() => {
    setUnseen(unseenSince(notes, seenAtMs.current))
  }, [notes])

  useEffect(() => {
    onScreen.current = active
    if (!active) {
      writing.current = false
      setEditing(false)
      setOpen(null)
      void flush()
    }
    relist()
  }, [active, idle, relist, flush])

  useEffect(() => {
    return () => {
      void flush()
    }
  }, [flush])

  function startEdit(): void {
    writing.current = true
    setEditing(true)
  }

  function stopEdit(): void {
    writing.current = false
    setEditing(false)
    void flush().then(relist)
  }

  function save(id: string, text: string): void {
    setFresh(false)
    waiting.current = { id, text }
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      void flush()
    }, SAVE_AFTER_MS)
  }

  function rename(id: string, title: string): Promise<boolean> {
    setFresh(false)
    return flush()
      .then(() => window.desk.renameVaultNote(id, title))
      .then((note) => {
        if (note === null) return false
        openId.current = note.id
        setOpen(note)
        relist()
        return true
      })
      .catch(() => false)
  }

  function create(folder: string, title: string): void {
    void flush()
      .then(() => window.desk.createVaultNote(folder, title))
      .then((note) => {
        if (note === null) return
        openId.current = note.id
        setOpen(note)
        setFresh(true)
        startEdit()
        relist()
      })
      .catch(() => undefined)
  }

  function openNote(id: string): void {
    setFresh(false)
    writing.current = false
    setEditing(false)
    void flush()
      .then(() => window.desk.readVaultNote(id))
      .then((note) => {
        if (note !== null) setOpen(note)
      })
      .catch(() => undefined)
  }

  function openGuide(): void {
    openNote(GUIDE_ID)
  }

  function openTitle(title: string): void {
    const found = notes.find((one) => one.title === title)
    if (found) openNote(found.id)
  }

  function addFolder(name: string): void {
    void window.desk
      .addVaultFolder(name)
      .then(land)
      .catch(() => undefined)
  }

  function renameFolder(name: string, next: string): void {
    void flush()
      .then(() => window.desk.renameVaultFolder(name, next))
      .then(async (listing) => {
        land(listing)
        const at = `${name}/`
        const id = openId.current
        const moved = id === null || !id.startsWith(at) ? null : `${next}/${id.slice(at.length)}`
        if (moved === null || !listing.notes.some((one) => one.id === moved)) return
        const note = await window.desk.readVaultNote(moved)
        if (note === null) return
        openId.current = moved
        setOpen(note)
      })
      .catch(() => undefined)
  }

  function removeFolder(name: string): void {
    void window.desk
      .removeVaultFolder(name)
      .then(land)
      .catch(() => undefined)
  }

  function remove(id: string): void {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
    waiting.current = null
    void window.desk
      .removeVaultNote(id)
      .then(() => {
        writing.current = false
        setEditing(false)
        setOpen((current) => (current?.id === id ? null : current))
        openId.current = openId.current === id ? null : openId.current
        relist()
      })
      .catch(() => undefined)
  }

  return {
    folders,
    notes,
    open,
    loading,
    unseen,
    editing,
    fresh,
    openNote,
    openTitle,
    openGuide,
    remove,
    startEdit,
    stopEdit,
    save,
    rename,
    create,
    addFolder,
    renameFolder,
    removeFolder,
  }
}
