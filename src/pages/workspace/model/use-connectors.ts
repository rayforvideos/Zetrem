import { useEffect, useRef, useState } from 'react'
import type { Connector, ConnectorVerb, NewConnector } from '@/entities/connector'
import { tidyName } from '@/entities/connector'
import { outcomeLine, useAsk } from '@/shared/lib/ask/ask'

type Connectors = {
  connectors: Connector[]
  loading: boolean
  checked: boolean
  busy: string | null
  note: string | null
  adding: boolean
  act(verb: ConnectorVerb, target: string): void
  add(draft: NewConnector): Promise<boolean>
  importDesktop(): void
  reload(): void
}

const SAID: Record<ConnectorVerb, string> = {
  login: 'Signed in to',
  logout: 'Signed out of',
  remove: 'Removed',
}

const ADDING = 'adding'

export function useConnectors(wanted: boolean): Connectors {
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)
  const asked = useRef(false)
  const { busy, note, say, ask } = useAsk()

  function reload(): void {
    asked.current = true
    setLoading(true)
    void ask('list', 'Could not read your connectors', () => window.desk.listConnectors())
      .then((found) => {
        if (found === null) return
        setConnectors(found)
        setChecked(true)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!wanted || asked.current) return
    reload()
  }, [wanted])

  function act(verb: ConnectorVerb, target: string): void {
    void ask(target, `Could not reach ${target}`, () =>
      window.desk.connectorAct(verb, target),
    ).then((result) => {
      if (result === null) return
      reload()
      say(outcomeLine(result, `${SAID[verb]} ${target}`))
    })
  }

  function add(draft: NewConnector): Promise<boolean> {
    const name = tidyName(draft.name)
    return ask(ADDING, `Could not add ${name}`, () =>
      window.desk.addConnector(draft, connectors.map((one) => one.name)),
    ).then((result) => {
      if (result === null) return false
      if (result.ok) reload()
      say(outcomeLine(result, `Added ${name}. Sign in if it asks.`))
      return result.ok
    })
  }

  function importDesktop(): void {
    void ask(ADDING, 'Could not bring over Claude Desktop', () =>
      window.desk.importConnectors(),
    ).then((result) => {
      if (result === null) return
      reload()
      say(outcomeLine(result, 'Brought over what Claude Desktop had.'))
    })
  }

  return {
    connectors,
    loading,
    checked,
    busy,
    note,
    adding: busy === ADDING,
    act,
    add,
    importDesktop,
    reload,
  }
}
