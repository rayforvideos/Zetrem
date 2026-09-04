import { accountStatus, createChatStatus, createSessionStore } from '@/entities/agent-session'
import { sentOf, withPaths } from '@/entities/attachment'
import type { Attached } from '@/entities/attachment'
import { parseClaudeLine, permissionAlwaysResult, permissionResult } from '@/entities/claude-cli'
import type { ModelChoice } from '@/entities/claude-cli'
import type { Transcript } from '@/entities/conversation'
import { addressed } from '@/entities/teammate'
import { reasonOf } from '@/shared/lib/failure/failure'
import { advancePermission } from '../../../chat/conversation/advance-permission'
import { createConversation } from '../../../chat/conversation/conversation'
import { threadLearned, threadToSave } from '../../../chat/may-save/may-save'
import { applyAgentEvent } from '../../agent-events/agent-events'
import { freshRefs } from '../../agent-events/refs/refs'
import type { AgentStores } from '../../agent-events/agent-events.types'
import { afterYouStopped } from '../../asked-to-stop/asked-to-stop'
import { stirring } from '../../live/live'
import { shouldRelaunch } from '../../relaunch/relaunch'
import type { Attempt } from '../../relaunch/relaunch.types'
import { markOf, waitingOn } from '../../waiting/waiting'
import { beginSession, closeSession } from '../../session-bookkeeping/session-bookkeeping'
import { rememberHostChat } from '../../host-chats/host-chats'
import { attachAutosave } from './autosave/autosave'
import type {
  AgentEvent,
  ChatMeta,
  ChatRunConfig,
  ChatSession,
  ChatSessionDeps,
  LiveState,
} from './chat-session.types'
import type { Held } from '../../waiting/waiting.types'
import { t } from '@lingui/core/macro'

// Two chats can send in the same millisecond, and a host id that repeats
// would hand one chat's stream to the other.
let hosts = 0

// Until configure() lands: a run started with this asks about everything and
// lets the CLI pick, which is the safest thing to be wrong about.
const UNCONFIGURED: ChatRunConfig = {
  permissionMode: 'ask',
  model: 'default',
  effort: 'default',
  people: [],
  lock: null,
}

export function createChatSession(
  chatId: string,
  project: string,
  deps: ChatSessionDeps,
  // The registry hears every save this chat lands; a session made on its own
  // (a test) tells nobody.
  onSaved: () => void = () => undefined,
): ChatSession {
  const stores: AgentStores = {
    conversation: createConversation(),
    status: createChatStatus(),
    children: createSessionStore(),
  }
  const meta: ChatMeta = { title: null, folder: '', spend: null, resumeId: null }
  const { conversation } = stores

  let config: ChatRunConfig = UNCONFIGURED
  let refused: (model: ModelChoice) => void = () => undefined
  let hostId: string | null = null
  let attempt: Attempt | null = null
  let stopping = false

  const refs = freshRefs(stores, {
    onModelRefused: (model) => refused(model),
    // A limit belongs to the account, not to the chat that ran into it.
    onLimit: (limit) => accountStatus.applyLimit(limit),
  })

  // The id a chat resumes with: whatever the live run has reported, else what
  // its saved transcript came with.
  function thread(): string | null {
    const status = stores.status.get()
    return threadToSave({
      liveSessionId: status.session?.id ?? null,
      probed: status.probed,
      resumeId: meta.resumeId,
    })
  }

  const autosave = attachAutosave({ chatId, project, stores, meta, thread, deps, onSaved })

  // A reset empties the status store, and the next message must still pick the
  // conversation back up: the id a real run reported stays with the chat.
  function learn(): void {
    const status = stores.status.get()
    const learned = threadLearned({
      liveSessionId: status.session?.id ?? null,
      probed: status.probed,
    })
    if (learned !== null) meta.resumeId = learned
  }

  function launch(text: string, resume: string | null, files: Attached[]): void {
    beginSession(refs, resume !== null)
    hosts += 1
    const id = `agent-${Date.now()}-${hosts}`
    hostId = id
    // The process is what a proposal names itself by, so the chat it belongs
    // to is written down here, where the id is first handed out: a tool call
    // that lands later can then be shown against the chat that ran it.
    rememberHostChat(id, chatId)
    stopping = false
    attempt = { prompt: text, files, resumed: resume !== null, spoke: false }
    void deps
      .startAgent(id, text, { ...config, persona: '', resume }, files)
      .catch((cause: unknown) => {
        if (hostId !== id) return
        hostId = null
        attempt = null
        const said = reasonOf(cause)
        conversation.system(t`Could not start Claude Code: ${said}`)
        conversation.setStatus('done')
        conversation.setTrouble(true)
      })
  }

  function exited(event: Extract<AgentEvent, { kind: 'exit' }>): void {
    const stopped = stopping
    hostId = null
    stopping = false
    const failed = attempt
    attempt = null
    if (failed !== null && shouldRelaunch(failed, event.code)) {
      conversation.system(t`Could not pick that conversation back up. Starting a new one.`)
      launch(failed.prompt, null, failed.files)
      return
    }
    closeSession(refs, { reason: event.reason, stopped })
  }

  // A session hears only the process it started; another chat's stream is
  // another chat's business.
  function owns(id: string): boolean {
    return hostId === id
  }

  // What this chat has stopped for, named so the same wait reads the same
  // wherever the screen happens to be looking from.
  function heldNow(): Held | null {
    const conv = conversation.get()
    const found = waitingOn(conv, stirring(conv.status, stores.children.get()))
    return found === null ? null : { ...found, mark: markOf(conv) }
  }

  function reset(): void {
    const id = hostId
    hostId = null
    attempt = null
    refs.asks.length = 0
    refs.childIds.clear()
    refs.sends.clear()
    refs.limits.clear()
    stores.children.clear()
    stores.status.reset()
    conversation.settleDraft()
    conversation.setStatus('done')
    conversation.setPermission(null)
    conversation.setTrouble(false)
    // stopAgent kills the CLI and every background command it ran; the exit
    // event finds hostId already null, so closeSession never clears these.
    conversation.clearChores()
    if (id !== null) deps.stopAgent(id)
  }

  return {
    chatId,
    project,
    stores,
    meta,
    running(): boolean {
      return hostId !== null
    },
    owns,
    held: heldNow,
    live(): LiveState {
      const found = heldNow()
      if (found !== null) return found.kind === 'permission' ? 'asking' : 'question'
      return conversation.get().status === 'working' ? 'working' : 'idle'
    },
    configure(next: ChatRunConfig, onModelRefused: (model: ModelChoice) => void): void {
      config = next
      refused = onModelRefused
    },
    restore(saved: Transcript): void {
      meta.title = saved.title.length > 0 ? saved.title : null
      meta.folder = saved.folder
      meta.spend = saved.spend ?? null
      meta.resumeId = saved.sessionId
      if (saved.spend != null) stores.status.restoreChat(saved.spend)
      conversation.restore(saved.turns)
      autosave.markSaved()
    },
    send(text: string, to: string | null = null, files: Attached[] = []): void {
      conversation.say('user', text, to ?? undefined, sentOf(files))
      conversation.setStatus('working')
      const dressed = withPaths(addressed(text, to), files)
      // A stopped session is on its way out: this message starts a fresh one.
      if (hostId !== null && !stopping) {
        deps.sendToAgent(hostId, dressed, files)
        return
      }
      launch(dressed, thread(), files)
    },
    decide(allow: boolean, always = false): void {
      const id = hostId
      if (id === null || refs.asks.length === 0) return
      const current = refs.asks.shift() as (typeof refs.asks)[number]
      deps.respondPermission(
        id,
        current.requestId,
        allow && always
          ? permissionAlwaysResult(current.toolName, current.input)
          : permissionResult(allow, current.input),
      )
      advancePermission(conversation, refs.asks)
    },
    stop(): void {
      attempt = null
      stopping = true
      if (hostId !== null) deps.stopAgent(hostId)
    },
    // The process is replaced, not the conversation: the next message resumes
    // it in a session that has the team, permissions and model as they are now.
    restart(): void {
      reset()
      conversation.system(
        t`Session restarted. The next message picks the conversation back up with your team as it is now.`,
      )
    },
    reset,
    dispose: autosave.dispose,
    handle(event: AgentEvent): void {
      if (!owns(event.id)) return
      if (event.kind === 'exit') {
        exited(event)
        return
      }
      if (event.kind === 'workspace') return
      if (attempt !== null) attempt.spoke = true
      for (const turn of parseClaudeLine(event.line)) {
        applyAgentEvent(afterYouStopped(turn, stopping), refs)
      }
      learn()
    },
    thread,
    keep: autosave.keep,
    subscribe(listener: () => void): () => void {
      const stopConversation = conversation.subscribe(listener)
      const stopStatus = stores.status.subscribe(listener)
      const stopChildren = stores.children.subscribe(listener)
      return () => {
        stopConversation()
        stopStatus()
        stopChildren()
      }
    },
  }
}
