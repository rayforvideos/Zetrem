import { useEffect, useState } from 'react'
import type { Connector, ConnectorVerb } from '@/entities/connector'
import { reasonOf } from '@/shared/lib/failure/failure'

type Connectors = {
  connectors: Connector[]
  loading: boolean
  busy: string | null
  note: string | null
  act(verb: ConnectorVerb, target: string): void
  reload(): void
}

const SAID: Record<ConnectorVerb, string> = {
  login: 'Signed in to',
  logout: 'Signed out of',
  remove: 'Removed',
}

export function useConnectors(wanted: boolean): Connectors {
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  function reload(): void {
    setLoading(true)
    asked(() => window.desk.listConnectors())
      .then(setConnectors)
      .catch((cause: unknown) => setNote(reasonOf(cause)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!wanted) return
    reload()
  }, [wanted])

  function act(verb: ConnectorVerb, target: string): void {
    setBusy(target)
    setNote(null)
    asked(() => window.desk.connectorAct(verb, target))
      .then((result) => {
        setNote(result.ok ? `${SAID[verb]} ${target}` : lastLine(result.out))
        reload()
      })
      .catch((cause: unknown) => setNote(reasonOf(cause)))
      .finally(() => setBusy(null))
  }

  return { connectors, loading, busy, note, act, reload }
}

function asked<T>(ask: () => Promise<T>): Promise<T> {
  try {
    return ask()
  } catch (cause: unknown) {
    return Promise.reject(cause instanceof Error ? cause : new Error(String(cause)))
  }
}

function lastLine(out: string): string {
  const lines = out.split('\n').map((line) => line.trim()).filter((line) => line.length > 0)
  return lines.at(-1) ?? 'That did not work'
}
