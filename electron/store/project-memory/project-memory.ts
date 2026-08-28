import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import { queue } from '../queue/queue'
import { saveFile } from '../save-file/save-file'

const queued = queue()

const RECENT_MAX = 8

type Memory = { path?: string; recent?: string[] }

// On disk: project.json under userData, the shape from before projects.json.
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

function recentOf(memory: Memory): string[] {
  if (Array.isArray(memory.recent)) return memory.recent.filter((one) => typeof one === 'string')
  return typeof memory.path === 'string' ? [memory.path] : []
}

export function rememberProject(path: string): Promise<void> {
  return queued(async () => {
    const memory = await readMemory()
    const recent = mergeRecent(recentOf(memory), path)
    await saveFile(memoryPath(), JSON.stringify({ path, recent })).catch((cause: unknown) =>
      console.error('could not save the project', cause),
    )
  })
}

// The folder is no longer a project: nothing in main may keep working in it.
export function forgetRememberedProject(path: string): Promise<void> {
  return queued(async () => {
    const memory = await readMemory()
    if (memory.path !== path) return
    const recent = recentOf(memory).filter((one) => one !== path)
    await saveFile(memoryPath(), JSON.stringify({ recent })).catch((cause: unknown) =>
      console.error('could not save the project', cause),
    )
  })
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

// Passed on as a CLI cwd, which takes undefined rather than null.
export async function hereOrUndefined(): Promise<string | undefined> {
  return (await recallProject()) ?? undefined
}
