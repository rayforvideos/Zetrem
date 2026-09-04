import { randomUUID } from 'node:crypto'
import { existsSync, statSync } from 'node:fs'
import { readFile, rename } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { app, dialog } from 'electron'
import {
  forgetRememberedProject,
  recallProject,
  recentProjects,
  rememberProject,
} from '../store/project-memory/project-memory'
import {
  dropProjectAgents,
  moveProjectAgents,
} from '../agents/project-agents-home/project-agents-home'
import { projectKey } from '../store/project-key/project-key'
import { queue } from '../store/queue/queue'
import { saveFile } from '../store/save-file/save-file'
import { handle } from '../ipc/ipc'
import { addDirArgs, withDir, withoutDir } from './extra-dirs/extra-dirs'
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
    typeof one?.lastOpenedAtMs === 'number' &&
    // A project written before extra folders existed has none, and that is
    // the shape the old file has: absent, not empty.
    (one.extraDirs === undefined ||
      (Array.isArray(one.extraDirs) && one.extraDirs.every((dir) => typeof dir === 'string')))
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

function memoryOf(text: string): Memory {
  const parsed = JSON.parse(text) as Memory
  const projects = Array.isArray(parsed.projects) ? parsed.projects.filter(isProject) : []
  const current =
    typeof parsed.current === 'string' && projects.some((one) => one.id === parsed.current)
      ? parsed.current
      : null
  return { current, projects }
}

// What is written, and nothing more: no seeding from the older shape and no
// repair of a broken file. A session starting asks this, and it wants what the
// person put there, not a migration run behind their back.
async function storedMemory(): Promise<Memory> {
  try {
    return memoryOf(await readFile(memoryPath(), 'utf8'))
  } catch {
    return { current: null, projects: [] }
  }
}

async function readMemory(nowMs: number): Promise<Memory> {
  let text: string
  try {
    text = await readFile(memoryPath(), 'utf8')
  } catch {
    return seeded(nowMs)
  }
  try {
    return memoryOf(text)
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

async function createProjectNow(spot: string, nowMs: number): Promise<StoredProject | null> {
  const path = spot.trim()
  if (path.length === 0) return null
  try {
    if (!statSync(path).isDirectory()) return null
  } catch {
    return null
  }
  const memory = await readMemory(nowMs)
  const worn = freshestFirst(memory.projects).find((one) => one.path === path)
  if (worn !== undefined) return openProjectNow(worn.id, nowMs)
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

async function openProjectNow(id: string, nowMs: number): Promise<StoredProject | null> {
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

async function repathProjectNow(
  id: string,
  path: string,
  nowMs: number,
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
  // The teammates kept for this project are filed under its old path, so they
  // follow it to the new one. What is remembered is written first: a folder
  // that will not move is worth a line in the log, not a repath refused.
  await moveProjectAgents(found.path, path).catch((cause: unknown) =>
    console.warn(`could not move the teammates kept for ${found.path} to ${path}`, cause),
  )
  return moved
}

async function editDirsNow(
  id: string,
  edit: (project: StoredProject) => string[] | null,
  nowMs: number,
): Promise<StoredProject | null> {
  const memory = await readMemory(nowMs)
  const found = memory.projects.find((one) => one.id === id)
  if (found === undefined) return null
  const dirs = edit(found)
  if (dirs === null) return found
  const changed = { ...found, extraDirs: dirs }
  await writeMemory({
    ...memory,
    projects: memory.projects.map((one) => (one.id === id ? changed : one)),
  })
  return changed
}

async function forgetProjectNow(id: string, nowMs: number): Promise<void> {
  const memory = await readMemory(nowMs)
  const gone = memory.projects.find((one) => one.id === id)
  await writeMemory({
    current: memory.current === id ? null : memory.current,
    projects: memory.projects.filter((one) => one.id !== id),
  })
  // Main resolves its working folder from what was last remembered; a
  // forgotten current must not go on being the agents' and library's home.
  if (memory.current === id && gone !== undefined) await forgetRememberedProject(gone.path)
  if (gone === undefined) return
  // A repath can land two projects on one folder, and then they share a
  // drawer: the one that stays keeps its people.
  const shared = memory.projects.some(
    (one) => one.id !== id && projectKey(one.path) === projectKey(gone.path),
  )
  if (shared) return
  // The people kept for this project alone are forgotten with it, so nothing
  // of it is left sitting in userData. As with a repath, the record is already
  // written: a folder that will not go is logged, not raised.
  await dropProjectAgents(gone.path).catch((cause: unknown) =>
    console.warn(`could not remove the teammates kept for ${gone.path}`, cause),
  )
}

// Each of these reads projects.json, changes it and writes it back. Two at
// once, as from two quick clicks, would interleave and disagree; they run in
// turn instead.
const serial = queue()

export function createProject(
  spot: string,
  nowMs: number = Date.now(),
): Promise<StoredProject | null> {
  return serial(() => createProjectNow(spot, nowMs))
}

export function openProject(id: string, nowMs: number = Date.now()): Promise<StoredProject | null> {
  return serial(() => openProjectNow(id, nowMs))
}

export function repathProject(
  id: string,
  path: string,
  nowMs: number = Date.now(),
): Promise<StoredProject | null> {
  return serial(() => repathProjectNow(id, path, nowMs))
}

export function forgetProject(id: string, nowMs: number = Date.now()): Promise<void> {
  return serial(() => forgetProjectNow(id, nowMs))
}

export function addProjectDir(
  id: string,
  path: string,
  nowMs: number = Date.now(),
): Promise<StoredProject | null> {
  return serial(() =>
    editDirsNow(id, (project) => withDir(project.path, project.extraDirs ?? [], path), nowMs),
  )
}

export function removeProjectDir(
  id: string,
  path: string,
  nowMs: number = Date.now(),
): Promise<StoredProject | null> {
  return serial(() =>
    editDirsNow(id, (project) => withoutDir(project.extraDirs ?? [], path), nowMs),
  )
}

// The arguments the session running in this folder is started with. Main asks
// the record rather than the renderer: what a session may read outside its
// project is settled here, the same as its working folder is.
export async function extraDirArgs(workspace: string): Promise<string[]> {
  const memory = await storedMemory()
  const current = memory.projects.find((one) => one.id === memory.current)
  // Two projects can share a folder, and the one being worked in is the one
  // whose extra folders count.
  const mine =
    current?.path === workspace
      ? current
      : freshestFirst(memory.projects).find((one) => one.path === workspace)
  if (mine === undefined) return []
  return addDirArgs(mine.path, mine.extraDirs ?? [])
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

  // As with a project folder, only a folder the person chose in the dialog is
  // admitted: this one becomes a folder the session may read and write.
  handle('project:addDir', (_event, id: string, path: unknown) =>
    wasPicked(path) ? addProjectDir(id, path) : null,
  )

  handle('project:removeDir', (_event, id: string, path: unknown) =>
    typeof path === 'string' ? removeProjectDir(id, path) : null,
  )
}
