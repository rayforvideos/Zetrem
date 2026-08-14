import { useState } from 'react'
import type { Failure } from './failure.types'

const REMOTE_PREFIX = /^Error invoking remote method '[^']*':\s*/

export function reasonOf(cause: unknown): string {
  const text = cause instanceof Error ? cause.message : String(cause)
  return text.replace(REMOTE_PREFIX, '').trim()
}

export function useFailure(): {
  failure: Failure | null
  clear(): void
  report(what: string): (cause: unknown) => void
} {
  const [failure, setFailure] = useState<Failure | null>(null)

  function clear(): void {
    setFailure(null)
  }

  function report(what: string) {
    return (cause: unknown): void => setFailure({ what, why: reasonOf(cause) })
  }

  return { failure, clear, report }
}
