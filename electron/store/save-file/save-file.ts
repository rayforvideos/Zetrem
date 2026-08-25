import { rename, unlink, writeFile } from 'node:fs/promises'

export function partnerOf(path: string): string {
  return `${path}.saving`
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
}
