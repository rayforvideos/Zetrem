import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { reasonOf } from '../failure/failure'
import type { Asking, Ran } from './ask.types'
import { t } from '@lingui/core/macro'

export function lastLine(out: string, fallback = t`That did not work`): string {
  const lines = out
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  return lines.at(-1) ?? fallback
}

export function outcomeLine(result: Ran, done: string): string {
  return result.ok ? done : lastLine(result.out)
}

export function troubleLine(what: string, cause: unknown): string {
  const why = reasonOf(cause)
  return why.length > 0 ? `${what}: ${why}` : what
}

export function useAsk(): Asking {
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const open = useRef(0)

  function clear(): void {
    setNote(null)
  }

  async function ask<T>(key: string, what: string, task: () => Promise<T>): Promise<T | null> {
    open.current += 1
    setBusy(key)
    setNote(null)
    try {
      return await task()
    } catch (cause: unknown) {
      const said = troubleLine(what, cause)
      setNote(said)
      toast.error(said)
      return null
    } finally {
      open.current -= 1
      if (open.current === 0) setBusy(null)
    }
  }

  function say(line: string | null): void {
    setNote(line)
    if (line !== null && line.length > 0) toast(line)
  }

  return { busy, note, say, clear, ask }
}
