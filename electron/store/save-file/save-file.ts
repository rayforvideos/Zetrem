import { readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

let writes = 0

// Two writers on one file must not share a partner, or the first rename
// moves the second's half-written text into place.
export function partnerOf(path: string, tag: string = `${process.pid}-${++writes}`): string {
  return `${path}.${tag}.saving`
}

export async function saveFile(path: string, text: string): Promise<void> {
  const partner = partnerOf(path)
  try {
    await writeFile(partner, text, 'utf8')
    await rename(partner, path)
  } catch (cause: unknown) {
    await unlink(partner).catch(() => undefined)
    throw cause
  }
  await sweepLeftovers(path)
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
