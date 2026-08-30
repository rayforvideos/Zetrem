import { readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

let writes = 0

// Two writers on one file must not share a partner, or the first rename
// moves the second's half-written text into place.
export function partnerOf(path: string, tag: string = `${process.pid}-${++writes}`): string {
  return `${path}.${tag}.saving`
}

const RENAME_TRIES = 5
const RENAME_WAIT_MS = 40

// Windows refuses to move a file onto one another handle still holds, for
// the moment an indexer, a reader or a second writer has it; a short retry
// is the difference between a saved file and a lost one.
async function renameWithPatience(from: string, to: string): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await rename(from, to)
      return
    } catch (cause: unknown) {
      const code = (cause as { code?: string }).code
      const busy = code === 'EPERM' || code === 'EBUSY' || code === 'EACCES'
      if (!busy || attempt >= RENAME_TRIES) throw cause
      await new Promise((wake) => setTimeout(wake, RENAME_WAIT_MS * attempt))
    }
  }
}

async function throughPartner(
  path: string,
  data: string | Buffer,
  mode: number | undefined,
): Promise<void> {
  const partner = partnerOf(path)
  try {
    await writeFile(partner, data, mode === undefined ? 'utf8' : { encoding: 'utf8', mode })
    await renameWithPatience(partner, path)
  } catch (cause: unknown) {
    await unlink(partner).catch(() => undefined)
    throw cause
  }
  await sweepLeftovers(path)
}

export async function saveFile(path: string, text: string): Promise<void> {
  await throughPartner(path, text, undefined)
}

// Credentials and the slots that keep them: the partner is created with the
// mode the finished file must have, and the rename carries it over.
export async function saveSecretFile(path: string, data: string | Buffer): Promise<void> {
  await throughPartner(path, data, 0o600)
}

const LEFTOVER_AGE_MS = 60_000

// A run that died mid-write leaves its partner behind; a later write of the
// same file clears it. Only old ones go: a fresh one may be another write
// still on its way to its rename.
async function sweepLeftovers(path: string, nowMs: number = Date.now()): Promise<void> {
  const dir = dirname(path)
  const mine = `${basename(path)}.`
  const names = await readdir(dir).catch(() => [] as string[])
  await Promise.all(
    names
      .filter((name) => name.startsWith(mine) && name.endsWith('.saving'))
      .map(async (name) => {
        const file = join(dir, name)
        const info = await stat(file).catch(() => null)
        if (info !== null && nowMs - info.mtimeMs > LEFTOVER_AGE_MS) {
          await unlink(file).catch(() => undefined)
        }
      }),
  )
}
