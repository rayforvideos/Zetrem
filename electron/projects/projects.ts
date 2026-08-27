import { randomUUID } from 'node:crypto'
import { existsSync, statSync } from 'node:fs'
import { readFile, rename } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { app, dialog } from 'electron'
import {
  recallProject,
  recentProjects,
  rememberProject,
} from '../store/project-memory/project-memory'
import { saveFile } from '../store/save-file/save-file'
import { handle } from '../ipc/ipc'
import type { StoredProject } from './projects.types'

type Memory = { current: string | null; projects: StoredProject[] }

function memoryPath(): string {
  return join(app.getPath('userData'), 'projects.json')
}

function isProject(value: unknown): value is StoredProject {
  const one = value as StoredProject
  return (
    typeof one?.id === 'string' &&
    typeof one?.name === 'string' &&
    typeof one?.path === 'string' &&
    typeof one?.createdAtMs === 'number' &&
    typeof one?.lastOpenedAtMs === 'number'
  )
}

// The seeded id IS the path: the transcript store keys its folders by a hash
// of that string, so every chat lands where it already was.
async function seeded(nowMs: number): Promise<Memory> {
  const current = await recallProject()
  const known = await recentProjects()
  const paths = [...new Set([...(current === null ? [] : [current]), ...known])]
  const projects = paths.map((path, at) => ({
    id: path,
    name: basename(path),
    path,
    createdAtMs: nowMs,
    lastOpenedAtMs: nowMs - at,
  }))
  return { current, projects }
}

async function readMemory(nowMs: number): Promise<Memory> {
  let text: string
  try {
    text = await readFile(memoryPath(), 'utf8')
  } catch {
    return seeded(nowMs)
  }
  try {
    const parsed = JSON.parse(text) as Memory
    const projects = Array.isArray(parsed.projects) ? parsed.projects.filter(isProject) : []
    const current =
      typeof parsed.current === 'string' && projects.some((one) => one.id === parsed.current)
        ? parsed.current
        : null
    return { current, projects }
  } catch (cause: unknown) {
    const kept = `${memoryPath()}.broken`
    await rename(memoryPath(), kept).catch(() => undefined)
    console.error(`projects were unreadable, kept a copy at ${kept}`, cause)
    return seeded(nowMs)
  }
}

async function writeMemory(memory: Memory): Promise<void> {
  await saveFile(memoryPath(), JSON.stringify(memory)).catch((cause: unknown) =>
    console.error('could not save projects', cause),
  )
}

function freshestFirst(projects: StoredProject[]): StoredProject[] {
  return [...projects].sort((a, b) => b.lastOpenedAtMs - a.lastOpenedAtMs)
}

export async function listProjects(nowMs: number = Date.now()): Promise<StoredProject[]> {
  const memory = await readMemory(nowMs)
  return freshestFirst(memory.projects).filter((one) => existsSync(one.path))
}

export async function restoreProject(nowMs: number = Date.now()): Promise<StoredProject | null> {
  const memory = await readMemory(nowMs)
  const current = memory.projects.find((one) => one.id === memory.current) ?? null
  if (current === null || !existsSync(current.path)) return null
  return current
}

export async function createProject(
  spot: string,
  nowMs: number = Date.now(),
): Promise<StoredProject | null> {
  const path = spot.trim()
  if (path.length === 0) return null
  try {
    if (!statSync(path).isDirectory()) return null
  } catch {
    return null
  }
  const memory = await readMemory(nowMs)
  const worn = freshestFirst(memory.projects).find((one) => one.path === path)
  if (worn !== undefined) return openProject(worn.id, nowMs)
  const made: StoredProject = {
    id: randomUUID(),
    name: basename(path),
    path,
    createdAtMs: nowMs,
    lastOpenedAtMs: nowMs,
  }
  await writeMemory({ current: made.id, projects: [...memory.projects, made] })
  await rememberProject(path)
  return made
}

export async function openProject(
  id: string,
  nowMs: number = Date.now(),
): Promise<StoredProject | null> {
  const memory = await readMemory(nowMs)
  const found = memory.projects.find((one) => one.id === id)
  if (found === undefined || !existsSync(found.path)) return null
  const opened = { ...found, lastOpenedAtMs: nowMs }
  await writeMemory({
    current: id,
    projects: memory.projects.map((one) => (one.id === id ? opened : one)),
  })
  await rememberProject(found.path)
  return opened
}

export async function repathProject(
  id: string,
  path: string,
  nowMs: number = Date.now(),
): Promise<StoredProject | null> {
  try {
    if (!statSync(path).isDirectory()) return null
  } catch {
    return null
  }
  const memory = await readMemory(nowMs)
  const found = memory.projects.find((one) => one.id === id)
  if (found === undefined) return null
  const moved = { ...found, path }
  await writeMemory({
    ...memory,
    projects: memory.projects.map((one) => (one.id === id ? moved : one)),
  })
  if (memory.current === id) await rememberProject(path)
  return moved
}

export async function forgetProject(id: string, nowMs: number = Date.now()): Promise<void> {
  const memory = await readMemory(nowMs)
  await writeMemory({
    current: memory.current === id ? null : memory.current,
    projects: memory.projects.filter((one) => one.id !== id),
  })
}

// A renderer path becomes the agent's cwd, so only dialog paths are admitted.
const picked = new Set<string>()
const PICKED_MAX = 64

function admit(path: string): void {
  picked.add(path)
  if (picked.size <= PICKED_MAX) return
  const oldest = picked.values().next()
  if (!oldest.done) picked.delete(oldest.value)
}

function wasPicked(path: unknown): path is string {
  return typeof path === 'string' && picked.has(path)
}

export function registerProjects(): void {
  handle('project:pick', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    const path = result.canceled ? null : (result.filePaths[0] ?? null)
    if (path !== null) admit(path)
    return path
  })

  handle('project:restore', () => restoreProject())

  handle('project:list', () => listProjects())

  handle('project:create', (_event, path: unknown) =>
    wasPicked(path) ? createProject(path) : null,
  )

  handle('project:open', (_event, id: string) => openProject(id))

  handle('project:forget', (_event, id: string) => forgetProject(id))

  handle('project:repath', (_event, id: string, path: unknown) =>
    wasPicked(path) ? repathProject(id, path) : null,
  )
}
