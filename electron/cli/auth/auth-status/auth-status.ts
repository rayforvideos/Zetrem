import type { AuthStatus } from '@/entities/auth'

// What `claude auth status --json` printed, read into a status. The JSON may
// be pretty-printed over many lines and may sit after a warning line; the
// text from the first '{' to the last '}' is taken as the answer.
export function authStatusOf(stdout: string): AuthStatus {
  const start = stdout.indexOf('{')
  const end = stdout.lastIndexOf('}')
  if (start === -1 || end <= start) {
    return { state: 'unreachable', said: 'claude auth status gave no JSON' }
  }
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(stdout.slice(start, end + 1)) as Record<string, unknown>
  } catch {
    return { state: 'unreachable', said: 'claude auth status gave no JSON' }
  }
  if (parsed.loggedIn !== true) return { state: 'signed-out' }
  return {
    state: 'signed-in',
    email: typeof parsed.email === 'string' ? parsed.email : '',
    orgName: typeof parsed.orgName === 'string' ? parsed.orgName : null,
  }
}

// The run ended badly. Signed out is one such ending: the CLI exits non-zero
// and still prints its JSON, so what it printed is read before anything else
// is concluded. Only a run that said nothing usable is unreachable.
export function authFailureOf(cause: unknown): AuthStatus {
  const failed = cause as {
    code?: string | number
    killed?: boolean
    stdout?: string
    stderr?: string
    message?: string
  }
  if (failed.code === 'ENOENT') return { state: 'cli-missing' }
  if (typeof failed.stdout === 'string' && failed.stdout.includes('{')) {
    const said = authStatusOf(failed.stdout)
    if (said.state !== 'unreachable') return said
  }
  const said = failed.killed
    ? 'claude auth status did not answer in time'
    : (failed.stderr || failed.message || 'claude auth status failed').trim()
  return { state: 'unreachable', said }
}
