import { useEffect, useState } from 'react'
import {
  askTrouble,
  diffRows,
  emptyDiffNote,
  rollbackDone,
  troubleLine,
} from '../lib/review/review'
import type { DiffRow, Landed } from '../lib/review/review.types'

type Review = {
  rows: DiffRow[] | null
  note: string
  landed: Landed | null
  busy: boolean
  confirming: boolean
  show(): void
  ask(): void
  rollback(): void
  cancel(): void
}

export function useWorktreeReview(agentId: string | undefined): Review {
  const [rows, setRows] = useState<DiffRow[] | null>(null)
  const [note, setNote] = useState('')
  const [landed, setLanded] = useState<Landed | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)

  // The report is one pane the runs step through, so what was read for the
  // teammate before this one must not be left standing under this one's name.
  useEffect(() => {
    setRows(null)
    setNote('')
    setLanded(null)
    setBusy(false)
    setConfirming(false)
  }, [agentId])

  async function look(id: string): Promise<Landed | null> {
    setBusy(true)
    const found = await window.desk.worktreeDiff(id).catch(() => null)
    setBusy(false)
    if (found === null) {
      setNote(askTrouble())
      return null
    }
    if (!found.ok) {
      setRows(null)
      setNote(troubleLine(found.why))
      return null
    }
    const shown = diffRows(found.value.diff)
    setRows(shown)
    setNote(shown.length === 0 ? emptyDiffNote() : '')
    setLanded(found.value.state)
    return found.value.state
  }

  return {
    rows,
    note,
    landed,
    busy,
    confirming,
    show(): void {
      if (agentId !== undefined) void look(agentId)
    },
    // The confirm has to name which of the two cases this is, so the state is
    // read before it opens, and nothing is asked that could not be answered.
    ask(): void {
      if (agentId === undefined) return
      void look(agentId).then((state) => setConfirming(state !== null))
    },
    cancel(): void {
      setConfirming(false)
    },
    rollback(): void {
      if (agentId === undefined || landed === null) return
      setConfirming(false)
      setBusy(true)
      void window.desk
        .worktreeRollback(agentId)
        .catch(() => null)
        .then((done) => {
          setBusy(false)
          if (done === null) {
            setNote(askTrouble())
            return
          }
          if (!done.ok) {
            setNote(troubleLine(done.why))
            return
          }
          setRows(null)
          setLanded(null)
          setNote(rollbackDone(done.value.state))
        })
    },
  }
}
