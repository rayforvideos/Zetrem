import type { Settings } from '@/entities/settings/model/settings/settings.types'
import type { Project } from '@/entities/project/model/project'
import type { AuthStatus } from '@/entities/auth/model/auth'
import type { AccountList } from '@/entities/auth/model/accounts'
import type { ChatSummary } from '@/entities/conversation/model/transcript/transcript.types'
import type { AgentDef } from '@/entities/agent-def/api/frontmatter/frontmatter.types'
import type { LibraryListing, LibraryNote } from '@/entities/library/model/note'
import type { LibraryProposal } from '@/entities/library/model/proposal'
import type { GitStatus, GraphCommit } from '@/entities/git/model/repo'

// The demo answers from memory: there is no main process behind this page, so
// every reading a screen asks for is written here once and stays put.
export const DEMO_PROJECT: Project = {
  id: 'demo-zetrem',
  path: '/Users/you/workspace/Zetrem',
  name: 'Zetrem',
}

export const DEMO_CHAT_ID = 'chat-demo-tour'

export const DEMO_SETTINGS: Settings = {
  permissionMode: 'ask',
  model: 'default',
  effort: 'default',
  refusedModels: [],
  userName: '개발자',
  userFace: 'ghost',
  setupDone: true,
  onboarded: true,
  // The app's own first-run bubbles are marked read: the tour is the guide
  // here, and two cards explaining the same box at once is one too many.
  hintsSeen: ['ask-whole-job', 'hire-first'],
  knownTools: [],
  knownAgents: [],
  stockOff: [],
  wasStockOn: null,
  tongue: 'ko',
  enterSends: true,
  theme: 'dark',
  notify: false,
  chrome: false,
  passEnv: [],
  sidebarOpen: true,
  sidebarWidth: 260,
  gitColumns: { refs: 112, changes: 128, author: 96, sha: 56, when: 48 },
  starAskedAtMs: null,
  starred: false,
}

export const DEMO_AUTH: AuthStatus = {
  state: 'signed-in',
  email: 'you@example.com',
  orgName: null,
}

export const DEMO_ACCOUNTS: AccountList = {
  auth: DEMO_AUTH,
  here: { kind: 'named', email: 'you@example.com', orgName: null },
  accounts: [{ id: 'demo-account', email: 'you@example.com', orgName: null, seenAt: Date.now() }],
}

export const DEMO_CHATS: ChatSummary[] = [
  {
    id: DEMO_CHAT_ID,
    title: '저장소 구조를 세 갈래로 나눠 분석',
    sessionId: null,
    savedAtMs: Date.now(),
    folder: '',
  },
]

// The three teammates the tour shows working at once. Their prompts are the
// real thing: what is read here is what a person would have typed into the form.
export const DEMO_AGENTS: AgentDef[] = [
  {
    character: 'planet',
    name: 'Electron Developer',
    description: '일렉트론 메인 프로세스, IPC, 프로세스 관리 작업일 때',
    model: null,
    tools: [],
    knowledge: [],
    prompt: '메인 프로세스와 IPC 경계를 담당한다. 보안 게이트와 프로세스 생명주기를 먼저 본다.',
    source: 'project',
    path: '',
    worktree: true,
  },
  {
    character: 'rock',
    name: 'React Developer',
    description: '렌더러, 컴포넌트, 상태 관리 작업일 때',
    model: null,
    tools: [],
    knowledge: [],
    prompt: 'Feature-Sliced Design 구조를 지키며 렌더러를 담당한다. 순수 로직은 lib 으로 뺀다.',
    source: 'project',
    path: '',
    worktree: true,
  },
  {
    character: 'star',
    name: 'Code Reviewer',
    description: '코드 리뷰, 테스트, 규약 점검이 필요할 때',
    model: null,
    tools: [],
    knowledge: [],
    prompt: '규약과 테스트를 본다. 고치지 않고 무엇이 어긋났는지만 보고한다.',
    source: 'project',
    path: '',
    worktree: false,
  },
]

const HOUR = 3_600_000

export const DEMO_NOTES: LibraryNote[] = [
  {
    id: '릴리즈-절차.md',
    folder: '',
    title: '릴리즈는 태그 하나로 돈다',
    summary: 'v* 태그를 푸시하면 CI 가 macOS 와 Windows 패키지를 빌드해 릴리즈에 올린다.',
    tags: ['release', 'ci'],
    source: 'agent',
    createdAtMs: Date.now() - 48 * HOUR,
    updatedAtMs: Date.now() - 6 * HOUR,
    body: [
      '릴리즈는 태그 하나로 돈다. `v*` 태그를 푸시하면 `.github/workflows/platforms.yml` 이',
      'macOS(universal dmg/zip, 서명·공증)와 Windows(NSIS exe)를 빌드해 GitHub Release 에 올린다.',
      '',
      '## 순서',
      '',
      '1. `release-prep-<버전>` 브랜치에서 `package.json` 의 버전만 올려 PR 을 연다.',
      '2. 머지된 커밋에 annotated 태그를 달고 푸시한다.',
      '3. CI 가 빌드·서명·업로드까지 한다. 릴리즈 노트는 사람이 쓴다.',
      '',
      '서명 시크릿이 없으면 Windows 자산만 올라간 릴리즈가 성공으로 끝나니, 끝나고 자산 수를 센다.',
    ].join('\n'),
  },
  {
    id: '작업은-이슈에서.md',
    folder: '',
    title: '작업은 GitHub 이슈에서 시작한다',
    summary:
      '새 작업을 받으면 먼저 이슈 트래커를 확인하고, 분석에서 찾은 문제도 이슈로 먼저 올린다.',
    tags: ['workflow', 'github'],
    source: '',
    createdAtMs: Date.now() - 72 * HOUR,
    updatedAtMs: Date.now() - 30 * HOUR,
    body: [
      '작업은 GitHub 이슈 트래커에서 시작한다. 분석하다 찾은 문제도 임의로 고치기보다',
      '이슈로 먼저 등록한다.',
      '',
      '커밋은 영어, Conventional Commit 접두사, 제목 72자 이내. `tests/conventions/commit-shape.test.ts`',
      '가 전체 로그를 검사하므로 어기면 테스트가 알려준다.',
      '',
      '관련: [[릴리즈는 태그 하나로 돈다]]',
    ].join('\n'),
  },
  {
    id: 'ipc-계약.md',
    folder: '구조',
    title: 'IPC 는 desk.types.ts 한 계약으로 묶인다',
    summary:
      '메인·preload·렌더러 세 면이 한 파일의 채널 맵에서 파생되고, 규약 테스트가 어긋남을 막는다.',
    tags: ['architecture', 'ipc'],
    source: 'agent',
    createdAtMs: Date.now() - 24 * HOUR,
    updatedAtMs: Date.now() - 24 * HOUR,
    body: [
      'Zetrem 의 IPC 채널은 `src/app/desk/desk.types.ts` 의 `Invokes` / `Sends` / `Pushes`',
      '세 맵이 유일한 계약이다. 메인·preload·렌더러가 모두 이 파일을 참조하고,',
      '`tests/conventions/ipc-channels.test.ts` 가 세 쪽의 집합이 일치하는지 CI 에서 강제한다.',
      '',
      '채널을 더하거나 뺄 때는 세 곳을 함께 고쳐야 하며, 한 곳만 고치면 테스트가 깨진다.',
    ].join('\n'),
  },
]

export const DEMO_LISTING: LibraryListing = {
  folders: [{ name: '구조' }],
  notes: DEMO_NOTES.map(({ body: _body, ...summary }) => summary),
}

// What the session asks to keep. Nothing is in the library until the person
// accepts, which is the moment the tour stops on.
export const DEMO_PROPOSALS: LibraryProposal[] = [
  {
    id: 'proposal-worktree',
    folder: '구조',
    title: '팀원은 자기 worktree 에서 일하고 브랜치로 돌아온다',
    body: [
      '팀원마다 자기 git worktree 를 받는다. 변경은 working tree 에 바로 닿지 않고',
      '브랜치로 돌아오며, 오케스트레이터가 하나씩 합친다.',
      '',
      '새 worktree 에는 `node_modules` 가 없으므로 메인 체크아웃의 것을 심볼릭 링크로 걸어 준다.',
      '팀원 브리프에 "없으면 기다려라, 직접 설치하지 마라" 가 들어가는 이유다.',
    ].join('\n'),
    tags: ['architecture', 'worktree', 'teammates'],
    proposedAtMs: Date.now() - 40_000,
    session: 'demo-host',
    by: 'Electron Developer',
  },
]

export const DEMO_GIT_STATUS: GitStatus = {
  branch: 'master',
  upstream: 'origin/master',
  ahead: 0,
  behind: 0,
  files: [],
}

// A short sha is what a person reads; the graph joins commits by the full one,
// so the parents are written short here and grown the same way the commit is.
function full(short: string): string {
  return `${short}${'0'.repeat(40 - short.length)}`
}

function commit(
  short: string,
  subject: string,
  parents: string[],
  refs: string[],
  hoursAgo: number,
  stat: { files: number; adds: number; dels: number },
  head = false,
): GraphCommit {
  return {
    sha: full(short),
    short,
    parents: parents.map(full),
    refs,
    head,
    author: 'Ray',
    email: 'you@example.com',
    at: Date.now() - hoursAgo * HOUR,
    subject,
    stat,
  }
}

export const DEMO_GRAPH: GraphCommit[] = [
  commit(
    'd99c17c',
    'Merge pull request #168 from release-prep-1.0.2-beta.5',
    ['fe28ce0', '19a2ff0'],
    ['master', 'v1.0.2-beta.5'],
    2,
    { files: 2, adds: 3, dels: 3 },
    true,
  ),
  commit(
    'fe28ce0',
    'chore: 1.0.2-beta.5, the version this branch has been carrying',
    ['19a2ff0'],
    [],
    3,
    { files: 2, adds: 3, dels: 3 },
  ),
  commit('19a2ff0', 'Merge pull request #164 from bug-fix-#114', ['3e15600', 'c233515'], [], 4, {
    files: 13,
    adds: 268,
    dels: 41,
  }),
  commit(
    'c233515',
    'fix: keep a reply with tool calls in it as one turn, tools in place',
    ['3e15600'],
    [],
    5,
    { files: 13, adds: 268, dels: 41 },
  ),
  commit('3e15600', 'Merge pull request #158 from bug-fix-#140', ['9609d59', '5258eec'], [], 6, {
    files: 4,
    adds: 22,
    dels: 14,
  }),
  commit(
    '5258eec',
    'fix: hold the reply back from the pane until it has landed',
    ['9609d59'],
    [],
    7,
    { files: 4, adds: 22, dels: 14 },
  ),
  commit('9609d59', 'Merge pull request #163 from bug-fix-#122', ['32e4708', '0010dde'], [], 8, {
    files: 5,
    adds: 96,
    dels: 18,
  }),
  commit('0010dde', 'fix: land at the latest turn when coming back to a chat', ['32e4708'], [], 9, {
    files: 5,
    adds: 96,
    dels: 18,
  }),
  commit('32e4708', 'Merge pull request #165 from bug-fix-#81', ['b456a13', 'affd6c9'], [], 10, {
    files: 11,
    adds: 184,
    dels: 52,
  }),
  commit(
    'affd6c9',
    'fix: name a cancelled sign-in instead of quoting the CLI at the person',
    ['b456a13'],
    [],
    11,
    { files: 11, adds: 184, dels: 52 },
  ),
  commit('b456a13', 'Merge pull request #162 from bug-fix-#146', ['0515114', '6efca22'], [], 12, {
    files: 4,
    adds: 61,
    dels: 4,
  }),
  commit('0515114', 'Merge pull request #161 from bug-fix-#123', ['0c220ae', '5e7543b'], [], 13, {
    files: 10,
    adds: 238,
    dels: 21,
  }),
  commit(
    '0c220ae',
    'Merge pull request #159 from bug-fix-#144-#145',
    ['0bdf9cf', '8f73536'],
    [],
    14,
    { files: 8, adds: 191, dels: 22 },
  ),
  commit('0bdf9cf', 'Merge pull request #160 from bug-fix-#157', ['7af9220', 'f648566'], [], 15, {
    files: 3,
    adds: 67,
    dels: 2,
  }),
  commit(
    '7af9220',
    'Merge pull request #139 from release-prep-1.0.2-beta.4',
    ['b2cf0ae'],
    ['v1.0.2-beta.4'],
    40,
    { files: 2, adds: 3, dels: 3 },
  ),
]

// The status strip parses this the way it parses the CLI's own `/usage` output,
// so the bar a visitor sees is drawn by the app's parser, not faked beside it.
function resetWhen(daysAhead: number, hour: number): string {
  const at = new Date(Date.now() + daysAhead * 24 * HOUR)
  const month = at.toLocaleString('en-US', { month: 'short' })
  const suffix = hour >= 12 ? 'pm' : 'am'
  const shown = hour % 12 === 0 ? 12 : hour % 12
  return `${month} ${at.getDate()} at ${shown}${suffix}`
}

export function demoUsageReport(): string {
  return [
    `Current session: 14% used · resets ${resetWhen(0, 20)}`,
    `Current week (all models): 43% used · resets ${resetWhen(5, 9)}`,
    `Current week (Opus): 12% used · resets ${resetWhen(5, 9)}`,
  ].join('\n')
}
