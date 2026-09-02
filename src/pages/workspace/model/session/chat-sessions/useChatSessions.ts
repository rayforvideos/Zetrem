import { useEffect } from 'react'
import { chatSessions } from './chat-sessions'

// The registry needs somewhere to send its process calls before the first
// chat can open. Attached once, at module load, so a screen rebuild (which
// re-runs useWorkspace but not this module) never attaches twice.
let attached = false

export function useChatSessions(): void {
  if (!attached) {
    attached = true
    chatSessions.attach({
      startAgent: (id, prompt, config, files) => window.desk.startAgent(id, prompt, config, files),
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

  useEffect(() => window.desk.onAgentEvent((event) => chatSessions.handle(event)), [])
}
