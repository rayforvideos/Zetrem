import { useEffect } from 'react'
import { chatSessions } from './chat-sessions'

// The registry needs somewhere to send its process calls before the first
// chat can open. Attached once, at module load, so a screen rebuild (which
// re-runs useWorkspace but not this module) never attaches twice.
let attached = false

export function useChatSessions(): void {
  // Runs before useTranscript's effect: both hooks are called from the same
  // component (useWorkspace), this one first, and mount effects for a single
  // component fire in the order their hooks were declared.
  useEffect(() => {
    if (!attached) {
      attached = true
      chatSessions.attach({
        startAgent: (id, prompt, config, files) =>
          window.desk.startAgent(id, prompt, config, files),
        sendToAgent: (id, text, files) => window.desk.sendToAgent(id, text, files),
        stopAgent: (id) => window.desk.stopAgent(id),
        respondPermission: (id, requestId, result) =>
          window.desk.respondPermission(id, requestId, result),
        writeTranscript: (project, packed) => window.desk.writeTranscript(project, packed),
        // The session already writes "This chat is not being saved" into its own
        // conversation on the first failure of a streak; this hook must not say
        // it again.
        onSaveTrouble: () => undefined,
      })
    }
    return window.desk.onAgentEvent((event) => chatSessions.handle(event))
  }, [])
}
