const TROUBLE = /\b(error|errors|cannot|can't|could not|couldn't|failed|fatal|not found|denied|unauthorized|invalid)\b/i
const ANSI = /\[[0-9;]*[A-Za-z]/g
const MAX = 300

export function plainTrouble(line: string): string | null {
  const said = line.replace(ANSI, '').trim()
  if (said.length === 0) return null
  if (said.startsWith('{') || said.startsWith('[')) return null
  if (!TROUBLE.test(said)) return null
  return said.length > MAX ? `${said.slice(0, MAX)}...` : said
}
