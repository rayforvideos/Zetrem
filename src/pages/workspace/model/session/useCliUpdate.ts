import { t } from '@lingui/core/macro'
import { useCallback, useEffect, useRef, useState } from 'react'
import { accountStatus } from '@/entities/agent-session'
import type { Conversation } from '../chat/conversation/conversation.types'

export function useCliUpdate(
  cliVersion: string | null,
  conversation: Conversation | null,
): { updating: boolean; start(): void } {
  const [updating, setUpdating] = useState(false)
  const asked = useRef(false)
  const fallback = useRef<string | null>(null)

  useEffect(() => {
    fallback.current = cliVersion
  })

  const query = useCallback(async (): Promise<void> => {
    try {
      const { installed, latest, managedBy } = await window.desk.latestCliVersion()
      accountStatus.setUpdate({ current: installed ?? fallback.current, latest, managedBy })
    } catch {
      accountStatus.setUpdate({ current: fallback.current, latest: null, managedBy: null })
    }
  }, [])

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
        conversation?.system(output)
        void query()
      })
      .catch(() => conversation?.system(t`Could not start the update`))
      .finally(() => setUpdating(false))
  }

  return { updating, start }
}
