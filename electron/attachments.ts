import { readFile, stat } from 'node:fs/promises'
import { basename } from 'node:path'
import { dialog } from 'electron'
import { IMAGE_MAX_BYTES, imageTypeOf, kindOf } from '@/entities/attachment'
import type { Attached } from '@/entities/attachment'
import { recallProject } from './project-memory'
import { handle } from './ipc/ipc'

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
    return result.canceled ? [] : result.filePaths
  })

  handle('files:read', async (_event, paths: string[]): Promise<Attached[]> => {
    if (!Array.isArray(paths)) return []
    const found = await Promise.all(paths.filter((p) => typeof p === 'string').map(read))
    return found.filter((file): file is Attached => file !== null)
  })
}
