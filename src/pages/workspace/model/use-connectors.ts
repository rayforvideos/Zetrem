import { useEffect, useRef, useState } from 'react'
import type { Connector, ConnectorVerb, NewConnector } from '@/entities/connector'
import { shortName, tidyName } from '@/entities/connector'
import { outcomeLine, useAsk } from '@/shared/lib/ask/ask'
import { saidOrWhy } from '@/entities/connector'
import { t } from '@lingui/core/macro'

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

// Read at call time, never at import: the locale is not up yet when this module loads.
function said(verb: ConnectorVerb, target: string): string {
  // The rows already drop the "claude.ai " mouthful; the toast follows suit.
  const name = shortName(target)
  // claude mcp login opens the browser and exits before anyone has signed
  // in, so a finished command is not a finished sign-in — and either way the
  // tools only load into the next session.
  if (verb === 'login') return t`Finish signing in to ${name} in the browser. The next session picks it up.`
  if (verb === 'logout') return `${t`Signed out of`} ${name}`
  return `${t`Removed`} ${name}`
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
    void ask('list', t`Could not read your connectors`, () => window.desk.listConnectors())
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
    void ask(target, t`Could not reach ${shortName(target)}`, () =>
      window.desk.connectorAct(verb, target),
    ).then((result) => {
      if (result === null) return
      reload()
      say(saidOrWhy(outcomeLine(result, said(verb, target))))
    })
  }

  function add(draft: NewConnector): Promise<boolean> {
    const name = tidyName(draft.name)
    return ask(ADDING, t`Could not add ${name}`, () =>
      window.desk.addConnector(draft, connectors.map((one) => one.name)),
    ).then((result) => {
      if (result === null) return false
      if (result.ok) reload()
      say(saidOrWhy(outcomeLine(result, t`Added ${name}. Sign in if it asks.`)))
      return result.ok
    })
  }

  function importDesktop(): void {
    void ask(ADDING, t`Could not bring over Claude Desktop`, () =>
      window.desk.importConnectors(),
    ).then((result) => {
      if (result === null) return
      reload()
      say(outcomeLine(result, t`Brought over what Claude Desktop had.`))
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
