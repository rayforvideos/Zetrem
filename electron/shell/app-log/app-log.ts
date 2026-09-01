import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

const LOG_MAX = 512 * 1024

// Halved at the cap, cut on a line, newest kept: old trouble scrolls away.
export function trimmedLog(text: string, cap: number = LOG_MAX): string {
  if (text.length <= cap) return text
  const half = text.slice(-Math.floor(cap / 2))
  const at = half.indexOf('\n')
  return at < 0 ? half : half.slice(at + 1)
}

export function appLogPath(): string {
  return join(app.getPath('userData'), 'zetrem-log.txt')
}

// A packaged app has no console anyone reads; what would explain a silent
// failure goes to one plain file the person can open and send.
export function logLine(area: string, said: string): void {
  const line = `${new Date().toISOString()} [${area}] ${said}\n`
  try {
    const path = appLogPath()
    appendFileSync(path, line)
    const grown = readFileSync(path, 'utf8')
    if (grown.length > LOG_MAX) writeFileSync(path, trimmedLog(grown))
  } catch {
    // A log that cannot be written must not take the feature with it.
  }
}
