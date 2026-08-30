import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'

export function keptUsagePath(): string {
  return join(app.getPath('userData'), 'usage.json')
}

// A reading belongs to the account it was taken for, so an account change
// makes the file worthless: it goes before anything can serve it again.
export async function forgetKeptUsage(): Promise<void> {
  await rm(keptUsagePath(), { force: true }).catch(() => undefined)
}
