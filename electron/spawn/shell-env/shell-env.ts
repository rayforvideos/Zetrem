import { isEnvName } from '@/entities/settings/lib/env-name/env-name'

// Without these a Windows child has no home, so the CLI cannot find the
// credentials it just wrote, and no SystemRoot, which many Windows APIs need
// before they will run at all.
const KEEP_WINDOWS = [
  'USERPROFILE',
  'HOMEDRIVE',
  'HOMEPATH',
  'APPDATA',
  'LOCALAPPDATA',
  'PROGRAMDATA',
  'PROGRAMFILES',
  'PROGRAMFILES(X86)',
  'SYSTEMROOT',
  'SYSTEMDRIVE',
  'WINDIR',
  'COMSPEC',
  'PATHEXT',
  'TEMP',
  'TMP',
  'USERNAME',
  'USERDOMAIN',
  'COMPUTERNAME',
  'NUMBER_OF_PROCESSORS',
  'PROCESSOR_ARCHITECTURE',
]

const KEEP_EXACT = new Set([
  'HOME',
  'USER',
  'LOGNAME',
  'SHELL',
  'PATH',
  'TMPDIR',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'SSH_AUTH_SOCK',
  'CLAUDE_CONFIG_DIR',
  'COMMAND_MODE',
  '__CF_USER_TEXT_ENCODING',
])

const KEEP_PREFIX = [
  'ANTHROPIC_',
  'AWS_BEARER_TOKEN_BEDROCK',
  // The CLI's own settings live under this prefix: which provider to talk to,
  // how many tokens it may spend, how long a command may run. Dropping them
  // left a terminal that behaved one way and Zetrem another, with nothing on
  // screen to say why.
  'CLAUDE_CODE_',
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'NO_PROXY',
]

const KEEP_PREFIX_CI = ['http_proxy', 'https_proxy', 'no_proxy']

// Kept out however they arrive. Zetrem is often started from a terminal that is
// itself a claude session, and these name that session rather than configure the
// next one: its socket, its transcript, its id. A child that inherits them
// believes it is a part of a conversation that is not its own. The CLAUDE_CODE_
// prefix above would otherwise wave them straight through.
const DROP_EXACT = new Set([
  'CLAUDE_CODE_CHILD_SESSION',
  'CLAUDE_CODE_MESSAGING_SOCKET',
  'CLAUDE_CODE_MESSAGING_TOKEN',
  'CLAUDE_CODE_SSE_PORT',
  'CLAUDE_CODE_ENTRYPOINT',
  'CLAUDE_CODE_AGENT',
  'CLAUDE_CODE_EXECPATH',
  'CLAUDE_CODE_VERSION',
  'CLAUDE_CODE_SPAWN_TIMESTAMP_MS',
  'CLAUDE_CODE_PROCESS_WRAPPER',
  'CLAUDE_CODE_TASK_LIST_ID',
  'CLAUDE_CODE_TRIGGER_ID',
])

const DROP_PREFIX = ['CLAUDE_CODE_SESSION_', 'CLAUDE_CODE_RESUME_']

const OURS: Record<string, string> = {
  GIT_EDITOR: 'true',
  ZETREM: '1',
  CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD: '1',
}

// An allow list rather than the whole environment, still. A desktop app inherits
// whatever launched it, which on a developer's machine is a shell full of tokens
// for services the agent has no business reaching, and named exceptions are the
// only way to widen it: `pass` carries names the person asked for, and the values
// are read from `source` here, never stored by the app.
export function agentEnv(
  source: Record<string, string | undefined>,
  loginPath?: string,
  pass: readonly string[] = [],
): Record<string, string> {
  const asked = new Set(pass.filter(isEnvName))
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue
    const lower = key.toLowerCase()
    // Windows names arrive in whatever case the shell felt like, so compare folded.
    const upper = key.toUpperCase()
    if (DROP_EXACT.has(upper) || DROP_PREFIX.some((prefix) => upper.startsWith(prefix))) continue
    const keep =
      KEEP_EXACT.has(upper) ||
      KEEP_WINDOWS.includes(upper) ||
      KEEP_PREFIX.some((prefix) => key.startsWith(prefix)) ||
      KEEP_PREFIX_CI.some((prefix) => lower.startsWith(prefix)) ||
      asked.has(key)
    if (keep) env[key] = value
  }
  // Both of these land after the loop on purpose: a named variable may add to
  // what the agent sees, never take over the path Zetrem worked out or the
  // settings Zetrem is entitled to decide for the run.
  if (loginPath && loginPath.length > 0) env.PATH = loginPath
  return { ...env, ...OURS }
}
