import { useCallback, useEffect, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { toast } from 'sonner'
import { unseenSince } from '@/entities/library'
import type {
  LibraryFolder,
  LibraryHit,
  LibraryListing,
  LibraryNote,
  LibraryNoteSummary,
} from '@/entities/library'

const SAVE_AFTER_MS = 800
const SEARCH_AFTER_MS = 150
const FRESH_TITLE = 'New note'

export function useLibraryNotes(active: boolean, idle: boolean, project: string | null) {
  const [folders, setFolders] = useState<LibraryFolder[]>([])
  const [notes, setNotes] = useState<LibraryNoteSummary[]>([])
  const [open, setOpen] = useState<LibraryNote | null>(null)
  const [backlinks, setBacklinks] = useState<LibraryNoteSummary[]>([])
  const [hits, setHits] = useState<LibraryHit[] | null>(null)
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [unseen, setUnseen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [fresh, setFresh] = useState(false)
  const [savedAtMs, setSavedAtMs] = useState<number | null>(null)
  const openId = useRef<string | null>(null)
  const shownProject = useRef<string | null>(project)
  const onScreen = useRef(active)
  const seenAtMs = useRef(Date.now())
  const writing = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const waiting = useRef<{ id: string; body: string } | null>(null)
  // The last write handed to main, so a delete can wait for it to land first.
  const inFlight = useRef<Promise<void>>(Promise.resolve())
  // The body as last typed, which `open` does not follow while an edit is on.
  const typed = useRef<{ id: string; body: string } | null>(null)

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
    if (job === null) return inFlight.current
    const write = window.desk
      .writeLibraryNote(job.id, job.body)
      .then(() => setSavedAtMs(Date.now()))
      .catch(() => undefined)
    inFlight.current = write
    return write
  }, [])

  const land = useCallback((listing: LibraryListing): void => {
    setFolders(listing.folders)
    setNotes(listing.notes)
  }, [])

  const show = useCallback(async (id: string): Promise<void> => {
    const note = await window.desk.readLibraryNote(id)
    if (note === null) return
    if (typed.current?.id !== id) typed.current = null
    setOpen(note)
    openId.current = id
    setBacklinks(await window.desk.libraryBacklinks(id))
  }, [])

  const relist = useCallback((): void => {
    setLoading(true)
    void window.desk
      .listLibraryNotes()
      .then(async (listing) => {
        land(listing)
        if (!onScreen.current || writing.current) return
        const id = openId.current
        // Nothing chosen yet: open the newest so the reader is never blank.
        if (id === null) {
          const newest = listing.notes[0]
          if (newest !== undefined) await show(newest.id)
          return
        }
        if (listing.notes.some((one) => one.id === id)) {
          await show(id)
          return
        }
        // The open note is gone (deleted, or a project switch): fall to the newest.
        const next = listing.notes[0]
        if (next !== undefined) await show(next.id)
        else {
          openId.current = null
          setOpen(null)
        }
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

  // Leaving the screen or switching projects: nothing from before carries over.
  // Another project's library is another library, so the open note, the search
  // and any edit in flight belong to the one being left.
  useEffect(() => {
    onScreen.current = active
    if (!active || project !== shownProject.current) {
      writing.current = false
      setEditing(false)
      setFresh(false)
      setOpen(null)
      openId.current = null
      setBacklinks([])
      setQuery('')
      setHits(null)
      setTag(null)
      void flush()
    }
    shownProject.current = project
    relist()
  }, [active, idle, project, relist, flush])

  // Closing the window or quitting must not drop the last few hundred
  // milliseconds of typing.
  useEffect(() => {
    const leave = (): void => {
      void flush()
    }
    window.addEventListener('beforeunload', leave)
    return () => window.removeEventListener('beforeunload', leave)
  }, [flush])

  // Agents write notes while the screen is open; main says when they do.
  useEffect(() => {
    return window.desk.onLibraryChanged(() => {
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
        .searchLibrary(query)
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
    typed.current = { id, body }
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      void flush()
    }, SAVE_AFTER_MS)
  }

  function rename(id: string, title: string): Promise<boolean> {
    setFresh(false)
    return flush()
      .then(() => window.desk.renameLibraryNote(id, title))
      .then((note) => {
        if (note === null) return false
        // Typing that queued during the rename belongs to the new id.
        if (waiting.current?.id === id) waiting.current = { ...waiting.current, id: note.id }
        if (typed.current?.id === id) typed.current = { ...typed.current, id: note.id }
        openId.current = note.id
        setOpen(note)
        relist()
        return true
      })
      .catch(() => false)
  }

  // What the note should say now: the text being typed, or the note as read.
  function bodyOf(id: string): string {
    if (typed.current?.id === id) return typed.current.body
    return open?.id === id ? open.body : ''
  }

  function tags(id: string, next: string[]): void {
    void flush()
      .then(() => window.desk.writeLibraryNote(id, bodyOf(id), { tags: next }))
      .then((note) => {
        if (note !== null) setOpen(note)
        relist()
      })
      .catch(() => undefined)
  }

  function create(folder: string | null): void {
    void flush()
      .then(() => window.desk.createLibraryNote(folder, FRESH_TITLE))
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

  // Putting the note down: what was being typed lands first, then the list
  // has the pane to itself again. Nothing about the search or the tag moves.
  function closeNote(): void {
    setFresh(false)
    writing.current = false
    setEditing(false)
    void flush()
      .then(() => {
        openId.current = null
        setOpen(null)
        setBacklinks([])
      })
      .catch(() => undefined)
  }

  function openTitle(title: string): void {
    const found = notes.find((one) => one.title === title)
    if (found) openNote(found.id)
  }

  // The bolt on an answer: the note lands at once, and the toast says where.
  function file(text: string): void {
    const filedIn = shownProject.current
    void window.desk
      .fileLibraryNote(text)
      .then((note) => {
        if (note === null) {
          toast.error(t`The answer could not be filed`)
          return
        }
        toast(t`Filed to the library · ${note.title}`, {
          action: {
            label: t`Undo`,
            onClick: () => {
              // The note is in the project it was filed to; after a switch the
              // same id in another project must not be the one removed.
              if (shownProject.current !== filedIn) {
                toast(t`That note is in another project now; open it there to remove it.`)
                return
              }
              void window.desk.removeLibraryNote(note.id).then(relist)
            },
          },
        })
        relist()
      })
      .catch(() => toast.error(t`The answer could not be filed`))
  }

  function addFolder(name: string): void {
    void window.desk
      .addLibraryFolder(name)
      .then(land)
      .catch(() => undefined)
  }

  function renameFolder(name: string, next: string): void {
    void flush()
      .then(() => window.desk.renameLibraryFolder(name, next))
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
      .removeLibraryFolder(name)
      .then(land)
      .catch(() => undefined)
  }

  function remove(id: string): void {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
    waiting.current = null
    // A write already on its way would write the note back after the remove.
    void inFlight.current
      .then(() => window.desk.removeLibraryNote(id))
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
    tag,
    open,
    backlinks,
    loading,
    unseen,
    editing,
    fresh,
    savedAtMs,
    setQuery,
    setTag,
    openNote,
    openTitle,
    closeNote,
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
    flush,
  }
}
