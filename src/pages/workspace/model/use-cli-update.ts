import { t } from '@lingui/core/macro'
import { useEffect, useRef, useState } from 'react'
import { conversation } from './conversation/conversation'
import { statusStore } from '@/entities/agent-session'

export function useCliUpdate(cliVersion: string | null): { updating: boolean; start(): void } {
  const [updating, setUpdating] = useState(false)
  const asked = useRef(false)
  const fallback = useRef<string | null>(null)
  fallback.current = cliVersion

  async function query(): Promise<void> {
    try {
      const { installed, latest, managedBy } = await window.desk.latestCliVersion()
      statusStore.setUpdate({ current: installed ?? fallback.current, latest, managedBy })
    } catch {
      statusStore.setUpdate({ current: fallback.current, latest: null, managedBy: null })
    }
  }

  useEffect(() => {
    if (!cliVersion || asked.current) return
    asked.current = true
    void query()
  }, [cliVersion, query])

  function start(): void {
    setUpdating(true)
    window.desk
      .runCliUpdate()
      .then(({ output }) => {
        conversation.system(output)
        void query()
      })
      .catch(() => conversation.system(t`Could not start the update`))
      .finally(() => setUpdating(false))
  }

  return { updating, start }
}
