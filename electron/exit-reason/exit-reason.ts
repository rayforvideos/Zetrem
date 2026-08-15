const MISSING = /\bENOENT\b|not found|no such file/i

export function exitReason(code: number | null, stderr: string, spawnError: string): string | null {
  if (code === 0) return null
  if (spawnError.trim().length > 0) return startTrouble(spawnError)
  const said = lastLine(stderr)
  if (said.length === 0) return null
  return MISSING.test(said) ? startTrouble(said) : said
}

export function startTrouble(cause: string): string {
  if (MISSING.test(cause)) {
    return 'The claude command was not found. Install the Claude Code CLI, then try again.'
  }
  const said = lastLine(cause)
  return said.length > 0 ? `Could not start Claude Code: ${said}` : 'Could not start Claude Code'
}

function lastLine(text: string): string {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  return lines.at(-1) ?? ''
}
