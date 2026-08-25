import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import { saveFile } from '../save-file/save-file'

const RECENT_MAX = 8

type Memory = { path?: string; recent?: string[] }

function memoryPath(): string {
  return join(app.getPath('userData'), 'project.json')
}

async function readMemory(): Promise<Memory> {
  try {
    return JSON.parse(await readFile(memoryPath(), 'utf8')) as Memory
  } catch {
    return {}
  }
}

export function mergeRecent(recent: string[], path: string): string[] {
  return [path, ...recent.filter((one) => one !== path)].slice(0, RECENT_MAX)
}

// A file written before the list existed holds only the one path.
function recentOf(memory: Memory): string[] {
  if (Array.isArray(memory.recent)) return memory.recent.filter((one) => typeof one === 'string')
  return typeof memory.path === 'string' ? [memory.path] : []
}

export async function rememberProject(path: string): Promise<void> {
  const memory = await readMemory()
  const recent = mergeRecent(recentOf(memory), path)
  await saveFile(memoryPath(), JSON.stringify({ path, recent })).catch((cause: unknown) =>
    console.error('could not save the project', cause),
  )
}

export async function recallProject(): Promise<string | null> {
  const memory = await readMemory()
  if (typeof memory.path !== 'string' || !existsSync(memory.path)) return null
  return memory.path
}

export async function recentProjects(): Promise<string[]> {
  const memory = await readMemory()
  return recentOf(memory).filter((one) => existsSync(one))
}

// Several IPC handlers pass the current project as a CLI cwd, which takes
// undefined rather than null for "no project yet".
export async function hereOrUndefined(): Promise<string | undefined> {
  return (await recallProject()) ?? undefined
}
