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
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'NO_PROXY',
]

const KEEP_PREFIX_CI = ['http_proxy', 'https_proxy', 'no_proxy']

const OURS: Record<string, string> = {
  GIT_EDITOR: 'true',
  ZETREM: '1',
  CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD: '1',
}

export function agentEnv(
  source: Record<string, string | undefined>,
  loginPath?: string,
): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue
    const lower = key.toLowerCase()
    // Windows names arrive in whatever case the shell felt like, so compare folded.
    const upper = key.toUpperCase()
    const keep =
      KEEP_EXACT.has(upper) ||
      KEEP_WINDOWS.includes(upper) ||
      KEEP_PREFIX.some((prefix) => key.startsWith(prefix)) ||
      KEEP_PREFIX_CI.some((prefix) => lower.startsWith(prefix))
    if (keep) env[key] = value
  }
  if (loginPath && loginPath.length > 0) env.PATH = loginPath
  return { ...env, ...OURS }
}
