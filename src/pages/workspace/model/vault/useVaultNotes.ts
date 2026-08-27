import { useCallback, useEffect, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { toast } from 'sonner'
import { GUIDE_ID, unseenSince } from '@/entities/vault'
import type {
  VaultFolder,
  VaultHit,
  VaultListing,
  VaultNote,
  VaultNoteSummary,
} from '@/entities/vault'
import type { VaultFilter } from '@/widgets/vault'

const SAVE_AFTER_MS = 800
const SEARCH_AFTER_MS = 150
const FRESH_TITLE = 'New note'

export function useVaultNotes(active: boolean, idle: boolean) {
  const [folders, setFolders] = useState<VaultFolder[]>([])
  const [notes, setNotes] = useState<VaultNoteSummary[]>([])
  const [open, setOpen] = useState<VaultNote | null>(null)
  const [backlinks, setBacklinks] = useState<VaultNoteSummary[]>([])
  const [hits, setHits] = useState<VaultHit[] | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<VaultFilter>('all')
  const [tag, setTag] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [unseen, setUnseen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [fresh, setFresh] = useState(false)
  const [savedAtMs, setSavedAtMs] = useState<number | null>(null)
  const openId = useRef<string | null>(null)
  const onScreen = useRef(active)
  const seenAtMs = useRef(Date.now())
  const writing = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const waiting = useRef<{ id: string; body: string } | null>(null)

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
      .writeVaultNote(job.id, job.body)
      .then(() => setSavedAtMs(Date.now()))
      .catch(() => undefined)
  }, [])

  const land = useCallback((listing: VaultListing): void => {
    setFolders(listing.folders)
    setNotes(listing.notes)
  }, [])

  const show = useCallback(async (id: string): Promise<void> => {
    const note = await window.desk.readVaultNote(id)
    if (note === null) return
    setOpen(note)
    openId.current = id
    setBacklinks(id === GUIDE_ID ? [] : await window.desk.vaultBacklinks(id))
  }, [])

  const relist = useCallback((): void => {
    setLoading(true)
    void window.desk
      .listVaultNotes()
      .then(async (listing) => {
        land(listing)
        if (!onScreen.current || writing.current) return
        const id = openId.current
        if (id === null) return
        if (id === GUIDE_ID || listing.notes.some((one) => one.id === id)) await show(id)
        else setOpen(null)
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [land, show])

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
      setQuery('')
      setHits(null)
      void flush()
    }
    relist()
  }, [active, idle, relist, flush])

  // Agents write files while the screen is open; main says when they do.
  useEffect(() => {
    return window.desk.onVaultChanged(() => {
      if (onScreen.current && !writing.current) relist()
    })
  }, [relist])

  useEffect(() => {
    return () => {
      void flush()
    }
  }, [flush])

  useEffect(() => {
    if (searchTimer.current !== null) clearTimeout(searchTimer.current)
    if (query.trim().length === 0) {
      setHits(null)
      return
    }
    searchTimer.current = setTimeout(() => {
      void window.desk
        .searchVault(query)
        .then(setHits)
        .catch(() => setHits([]))
    }, SEARCH_AFTER_MS)
  }, [query])

  function startEdit(): void {
    writing.current = true
    setSavedAtMs(null)
    setEditing(true)
  }

  function stopEdit(): void {
    writing.current = false
    setEditing(false)
    setFresh(false)
    void flush().then(relist)
  }

  function save(id: string, body: string): void {
    waiting.current = { id, body }
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

  function tags(id: string, next: string[]): void {
    void flush()
      .then(() => window.desk.writeVaultNote(id, open?.id === id ? open.body : '', { tags: next }))
      .then((note) => {
        if (note !== null) setOpen(note)
        relist()
      })
      .catch(() => undefined)
  }

  function create(folder: string | null): void {
    void flush()
      .then(() => window.desk.createVaultNote(folder, FRESH_TITLE))
      .then(async (note) => {
        if (note === null) return
        await show(note.id)
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
      .then(() => show(id))
      .catch(() => undefined)
  }

  function openGuide(): void {
    openNote(GUIDE_ID)
  }

  function openTitle(title: string): void {
    const found = notes.find((one) => one.title === title)
    if (found) openNote(found.id)
  }

  // The bolt on an answer: the note lands at once, and the toast says where.
  function file(text: string, session: string | null): void {
    void window.desk
      .fileVaultNote(text, session)
      .then((note) => {
        if (note === null) {
          toast.error(t`The answer could not be filed`)
          return
        }
        toast(t`Filed to the vault · ${note.title}`, {
          action: {
            label: t`Undo`,
            onClick: () => {
              void window.desk.removeVaultNote(note.id).then(relist)
            },
          },
        })
        relist()
      })
      .catch(() => toast.error(t`The answer could not be filed`))
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
        await show(moved)
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
    hits,
    query,
    filter,
    tag,
    open,
    backlinks,
    loading,
    unseen,
    editing,
    fresh,
    savedAtMs,
    setQuery,
    setFilter,
    setTag,
    openNote,
    openTitle,
    openGuide,
    remove,
    startEdit,
    stopEdit,
    save,
    rename,
    tags,
    create,
    file,
    addFolder,
    renameFolder,
    removeFolder,
  }
}
