import { readFile, stat } from 'node:fs/promises'
import { basename } from 'node:path'
import { dialog } from 'electron'
import {
  IMAGE_MAX_BYTES,
  imageTypeOf,
  kindOf,
} from '@/entities/attachment/lib/attachment/attachment'
import type { Attached } from '@/entities/attachment/lib/attachment/attachment.types'
import { recallProject } from '../../store/project-memory/project-memory'
import { handle } from '../../ipc/ipc'

// files:read serves only paths the dialog or a real dropped file produced.
const admitted = new Set<string>()

const ADMITTED_MAX = 512

function admit(path: string): void {
  admitted.add(path)
  if (admitted.size <= ADMITTED_MAX) return
  const oldest = admitted.values().next()
  if (!oldest.done) admitted.delete(oldest.value)
}

async function read(path: string): Promise<Attached | null> {
  let bytes: number
  try {
    const found = await stat(path)
    if (!found.isFile()) return null
    bytes = found.size
  } catch {
    return null
  }
  const kind = kindOf(path)
  const mediaType = imageTypeOf(path)
  const carry = kind === 'image' && bytes <= IMAGE_MAX_BYTES
  return {
    path,
    name: basename(path),
    kind,
    bytes,
    mediaType,
    data: carry ? (await readFile(path)).toString('base64') : null,
  }
}

export function registerAttachments(): void {
  handle('files:pick', async (): Promise<string[]> => {
    const project = await recallProject()
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      defaultPath: project ?? undefined,
    })
    if (result.canceled) return []
    result.filePaths.forEach(admit)
    return result.filePaths
  })

  // Only preload calls this; the bridge exposes no method for it.
  handle('files:admit', (_event, path: unknown): void => {
    if (typeof path !== 'string' || path.length === 0) return
    admit(path)
  })

  handle('files:read', async (_event, paths: unknown): Promise<Attached[]> => {
    if (!Array.isArray(paths)) return []
    const allowed = paths.filter((p) => typeof p === 'string' && admitted.has(p))
    const found = await Promise.all(allowed.map(read))
    return found.filter((file): file is Attached => file !== null)
  })
}
