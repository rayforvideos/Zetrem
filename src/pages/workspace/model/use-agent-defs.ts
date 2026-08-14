import { useCallback, useEffect, useState } from 'react'
import type { AgentDef, AgentDefDraft } from '@/entities/agent-def'

export function useAgentDefs() {
  const [defs, setDefs] = useState<AgentDef[]>([])
  const [note, setNote] = useState<string | null>(null)

  const reload = useCallback(() => {
    window.desk
      .listAgentDefs()
      .then(setDefs)
      .catch((cause: unknown) => setNote(reasonOf(cause)))
  }, [])

  useEffect(reload, [reload])

  const hire = useCallback(
    (draft: AgentDefDraft) => {
      setNote(null)
      window.desk
        .writeAgentDef(draft)
        .then((path) => {
          reload()
          setNote(`${path.split('/').slice(-1)[0]} 로 들였습니다 — 다음 세션부터 어느 프로젝트에서든 부릅니다`)
        })
        .catch((cause: unknown) => setNote(reasonOf(cause)))
    },
    [reload],
  )

  return { defs, hire, note }
}

function reasonOf(cause: unknown): string {
  const text = cause instanceof Error ? cause.message : String(cause)
  return text.includes('No handler registered')
    ? '앱을 다시 켜야 합니다 — 엔진 쪽이 아직 이 기능을 모릅니다'
    : text
}
