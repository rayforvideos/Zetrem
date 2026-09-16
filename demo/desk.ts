import type { DeskBridge } from '@/app/desk/desk'
import { lost, won } from '@/shared/lib/outcome/outcome'
import type { LibraryListing, LibraryNote } from '@/entities/library/model/note'
import type { LibraryProposal } from '@/entities/library/model/proposal'
import {
  DEMO_ACCOUNTS,
  DEMO_AGENTS,
  DEMO_AUTH,
  DEMO_CHATS,
  DEMO_GIT_STATUS,
  DEMO_GRAPH,
  DEMO_LISTING,
  DEMO_NOTES,
  DEMO_PROJECT,
  DEMO_PROPOSALS,
  DEMO_SETTINGS,
  demoUsageReport,
} from './fixtures'
import { DEMO_SCRIPT } from './script'

type Listener = (payload: never) => void

// The screen talks to one object and one only. Here that object answers from
// memory instead of from a main process, which is the whole of what makes this
// page a demo: everything above it is the app, unchanged.
const listeners = new Map<string, Set<Listener>>()

function push(channel: string, payload: unknown): void {
  const held = listeners.get(channel)
  if (!held) return
  for (const listener of held) (listener as (value: unknown) => void)(payload)
}

function listen(channel: string) {
  return (listener: Listener): (() => void) => {
    const held = listeners.get(channel) ?? new Set<Listener>()
    held.add(listener)
    listeners.set(channel, held)
    return () => held.delete(listener)
  }
}

// Which teammate names the tape uses, so the tour can wait on them by name.
let notes: LibraryNote[] = [...DEMO_NOTES]
let proposals: LibraryProposal[] = []
let settings = { ...DEMO_SETTINGS }

function listing(): LibraryListing {
  return {
    folders: DEMO_LISTING.folders,
    notes: notes.map(({ body: _body, ...summary }) => summary),
  }
}

// The tape runs once per session id. A permission ask parks it until the
// person answers, the way a live run waits on them rather than guessing.
const running = new Set<string>()
let answerPermission: ((allowed: boolean) => void) | null = null
let releaseHold: (() => void) | null = null
// A visitor can move on before the tape has even reached the stop it is to be
// held at. The leave is remembered rather than dropped, or the tape would park
// at a hold nobody is left to lift and the run would stall for good.
let released = false

// The tour is what starts the tape again, so the next thing on screen happens
// because the visitor moved on rather than because a timer ran out under them.
export function releaseTape(): void {
  released = true
  releaseHold?.()
}

// The CLI's own shape for an answer: allow carries the input on, deny carries
// a sentence back instead.
function allowed(result: unknown): boolean {
  return (result as { behavior?: string } | null)?.behavior === 'allow'
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function play(id: string): Promise<void> {
  if (running.has(id)) return
  running.add(id)
  released = false
  push('agent:event', { id, kind: 'workspace', cwd: DEMO_PROJECT.path })
  for (const beat of DEMO_SCRIPT) {
    if (!running.has(id)) return
    await wait(beat.afterMs)
    if (!running.has(id)) return
    push('agent:event', { id, kind: 'line', line: JSON.stringify(beat.event) })
    if (beat.raises === 'proposal') {
      proposals = [...DEMO_PROPOSALS]
      push('library:proposed', null)
    }
    if (beat.holds && !released) {
      await new Promise<void>((resolve) => {
        releaseHold = resolve
      })
      releaseHold = null
    }
    if (beat.holds) released = false
    if (beat.holdForAnswer) {
      // Turning it down is a real answer and the app really takes it: the card
      // goes and nothing runs. But the tape only has the run that was allowed,
      // so rather than play it anyway the question comes back.
      for (;;) {
        const allowed = await new Promise<boolean>((resolve) => {
          answerPermission = resolve
        })
        answerPermission = null
        if (allowed) break
        if (!running.has(id)) return
        await wait(700)
        if (!running.has(id)) return
        push('agent:event', { id, kind: 'line', line: JSON.stringify(beat.event) })
      }
    }
  }
  push('agent:event', {
    id,
    kind: 'exit',
    code: 0,
    signal: null,
    reason: null,
    asked: false,
  })
  running.delete(id)
}

const answers: Record<string, (...args: unknown[]) => unknown> = {
  appVersion: () => '1.0.2-beta.5 (둘러보기)',

  restoreProject: () => DEMO_PROJECT,
  listProjects: () => [DEMO_PROJECT],
  openProject: () => DEMO_PROJECT,
  pickProjectDir: () => null,
  createProject: () => DEMO_PROJECT,
  repathProject: () => DEMO_PROJECT,
  addProjectDir: () => DEMO_PROJECT,
  removeProjectDir: () => DEMO_PROJECT,
  forgetProject: () => undefined,

  startAgent: (id) => {
    void play(id as string)
  },
  probeSession: () => null,
  sessionUsage: () => demoUsageReport(),
  keptUsage: () => ({ report: demoUsageReport(), who: 'you@example.com' }),

  authStatus: () => DEMO_AUTH,
  listAccounts: () => DEMO_ACCOUNTS,

  listAgentDefs: () => DEMO_AGENTS,
  authoredAgents: () => DEMO_AGENTS.map((one) => one.name),
  pickKnowledge: () => [],

  readSettings: () => settings,
  writeSettings: (next) => {
    settings = next as typeof settings
    return settings
  },

  pickFiles: () => [],
  readFiles: () => [],

  pluginCatalog: () => ({ installed: [], available: [] }),
  pluginAvailable: () => ({ installed: [], available: [] }),
  marketplaces: () => [],
  listConnectors: () => [],

  listChats: () => DEMO_CHATS,
  readTranscript: () => null,
  writeTranscript: () => undefined,
  forgetTranscript: () => undefined,

  nudgeState: () => 'unasked',

  listLibraryNotes: () => listing(),
  readLibraryNote: (id) => notes.find((one) => one.id === id) ?? null,
  libraryBacklinks: () => [],
  searchLibrary: () => [],
  libraryOpenToAgents: () => true,
  setLibraryOpenToAgents: () => true,
  fileLibraryNote: (text) => {
    const body = String(text)
    const made: LibraryNote = {
      id: `${Date.now()}.md`,
      folder: '',
      title: '세 갈래 분석의 결론',
      summary: body.split('\n').find((line) => line.trim().length > 0) ?? '',
      tags: ['analysis'],
      source: '',
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
      body,
    }
    notes = [made, ...notes]
    push('library:changed', null)
    return { note: made, already: false }
  },
  listLibraryProposals: () => proposals,
  acceptLibraryProposal: (id) => {
    const found = proposals.find((one) => one.id === id)
    if (!found) return null
    proposals = proposals.filter((one) => one.id !== id)
    const made: LibraryNote = {
      id: `${found.title}.md`,
      folder: found.folder,
      title: found.title,
      summary: found.body.split('\n')[0] ?? '',
      tags: found.tags,
      source: 'agent',
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
      body: found.body,
    }
    notes = [made, ...notes]
    push('library:proposed', null)
    push('library:changed', null)
    return made
  },
  dismissLibraryProposal: (id) => {
    proposals = proposals.filter((one) => one.id !== id)
    push('library:proposed', null)
  },

  gitStatus: () => won(DEMO_GIT_STATUS),
  gitBranches: () => won([{ name: 'master', current: true }]),
  gitGraph: () => won(DEMO_GRAPH),
  gitStashList: () => won([]),
  gitLog: () => won(DEMO_GRAPH.map((one) => ({ sha: one.sha, subject: one.subject }))),
  gitShow: (sha) =>
    won(
      DEMO_GRAPH.find((one) => one.sha === sha || one.short === sha)?.stat.files
        ? [
            {
              path: 'src/widgets/conversation/ui/ConversationPane/ConversationPane.tsx',
              sign: 'M',
            },
            { path: 'src/entities/conversation/model/turn/turn.ts', sign: 'M' },
            { path: 'src/shared/locales/ko/messages.po', sign: 'M' },
          ]
        : [],
    ),

  gitShowDiff: () =>
    won(
      [
        'diff --git a/src/widgets/conversation/ui/ConversationPane/ConversationPane.tsx b/src/widgets/conversation/ui/ConversationPane/ConversationPane.tsx',
        '@@ -232,6 +232,14 @@',
        '               }',
        '+              // The draft is not drawn. Words arriving one at a time move and',
        '+              // reflow under the eye while the person is still reading the turn',
        '+              // before; the working row says "Writing" until they land.',
        '+              if (turn.thinking.length === 0 && turn.text.length === 0) {',
        '+                return null',
        '+              }',
        '               return (',
        '                 <article',
        '-                  {turn.draft.length > 0 && (',
        '-                    <span className="zt-caret" />',
        '-                  )}',
      ].join('\n'),
    ),
  gitDiff: () => won(''),

  updaterState: () => null,
  updaterCheck: () => ({ state: 'dev' }),
  updaterRestart: () => undefined,

  latestCliVersion: () => ({ installed: null, latest: null, managedBy: null }),

  pathForFile: async () => '',
}

const LISTEN: Record<string, string> = {
  onAgentEvent: 'agent:event',
  onAuthProgress: 'auth:progress',
  onLibraryChanged: 'library:changed',
  onLibraryProposed: 'library:proposed',
  onGitChanged: 'git:changed',
  onUpdaterReady: 'updater:ready',
}

const SENDS = new Set([
  'sendToAgent',
  'stopAgent',
  'respondPermission',
  'cancelLogin',
  'nudge',
  'openNotifySettings',
])

// Anything the tour never reaches answers the way the app already expects a
// refusal to read, so an unvisited corner shows a quiet note instead of a crash.
function fallback(name: string): unknown {
  if (name.startsWith('git') || name.startsWith('memory')) return lost('unsupported')
  if (name.startsWith('list') || name.startsWith('search')) return []
  return lost('unsupported')
}

export function installDemoDesk(): void {
  const desk = new Proxy(
    {},
    {
      get(_target, key: string) {
        if (key in LISTEN) return listen(LISTEN[key] as string)
        if (SENDS.has(key)) {
          return (...args: unknown[]) => {
            if (key === 'respondPermission') answerPermission?.(allowed(args[2]))
            if (key === 'stopAgent') running.delete(args[0] as string)
          }
        }
        const answer = answers[key]
        return async (...args: unknown[]) => (answer ? answer(...args) : fallback(key))
      },
    },
  )
  ;(window as unknown as { desk: DeskBridge }).desk = desk as DeskBridge
}
