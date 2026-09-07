import { useCallback } from 'react'
import { toast } from 'sonner'
import { t } from '@lingui/core/macro'
import type { AgentSession } from '@/entities/agent-session'
import type { ChatSummary } from '@/entities/conversation'
import { personaOf } from '@/entities/teammate'
import { copyText } from '@/shared/lib/platform/clipboard/clipboard'
import { chatSessions } from './chat-sessions/chat-sessions'
import { diagnosticsText } from './diagnostics/diagnostics'
import type { DiagnosticsAbout } from './diagnostics/diagnostics.types'

// "Copy diagnostics": the crew log a chat has been keeping, as text, for a
// bug report. A teammate's menu takes only the lines about that teammate; the
// chat's menu takes the lot.
export function useDiagnostics(chats: ChatSummary[], openId: string | null) {
  const copy = useCallback(
    (chatId: string, about: DiagnosticsAbout | null): void => {
      const session = chatSessions.find(chatId)
      if (session === null) {
        toast.error(t`No diagnostics for that chat: it is not open`)
        return
      }
      const chat = chats.find((one) => one.id === chatId)?.title ?? null
      const text = diagnosticsText(session.crewLog.entries(), { chat, about })
      void copyText(text).then((landed) => {
        if (landed) toast(t`Diagnostics copied`)
        else toast.error(t`Could not copy the diagnostics`)
      })
    },
    [chats],
  )

  return {
    copyChat: (chatId: string): void => copy(chatId, null),
    copyTeammate: (teammate: AgentSession): void => {
      if (openId === null) return
      copy(openId, aboutOf(teammate))
    },
  }
}

function aboutOf(teammate: AgentSession): DiagnosticsAbout {
  const task = teammate.taskId ?? ''
  return {
    seat: teammate.id,
    label: personaOf(teammate.subagentType || teammate.label).name,
    taskId: task.length > 0 ? task : null,
  }
}
