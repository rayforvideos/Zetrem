import { randomUUID } from 'node:crypto'
import { existsSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { app } from 'electron'
import { recallProject, recentProjects, rememberProject } from '../project-memory/project-memory'
import { saveFile } from '../save-file/save-file'
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

// A version without projects knew only paths. Each becomes a project whose id
// IS the path: the transcript store keys its folders by a hash of this very
// string, so every chat lands where it already was.
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
  } catch {
    return seeded(nowMs)
  }
}

async function writeMemory(memory: Memory): Promise<void> {
  await saveFile(memoryPath(), JSON.stringify(memory)).catch(() => undefined)
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
  // A project is a folder that is already there. Naming one into being made a
  // second project wear a folder some other project already had, which is the
  // shape categories were; picking the folder is the whole of it now.
  const path = spot.trim()
  if (path.length === 0) return null
  try {
    if (!statSync(path).isDirectory()) return null
  } catch {
    return null
  }
  const memory = await readMemory(nowMs)
  // One folder is one project, so landing on a folder that already wears one
  // reopens it instead of minting a twin.
  const name = basename(path)
  const worn = freshestFirst(memory.projects).find((one) => one.path === path)
  if (worn !== undefined) return openProject(worn.id, nowMs)
  const made: StoredProject = {
    id: randomUUID(),
    name,
    path,
    createdAtMs: nowMs,
    lastOpenedAtMs: nowMs,
  }
  await writeMemory({ current: made.id, projects: [...memory.projects, made] })
  // The rest of main asks project-memory for the working folder; opening a
  // project is what points it somewhere.
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
