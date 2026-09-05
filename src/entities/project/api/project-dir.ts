import type { Project } from '../model/project'

type Stored = { id: string; name: string; path: string; extraDirs?: string[] } | null

function toProject(stored: Stored): Project | null {
  if (!stored) return null
  return {
    id: stored.id,
    name: stored.name,
    path: stored.path,
    extraDirs: stored.extraDirs ?? [],
  }
}

export async function pickProject(): Promise<Project | null> {
  const path = await window.desk.pickProjectDir()
  if (path === null) return null
  return toProject(await window.desk.createProject(path))
}

export async function restoreProject(): Promise<Project | null> {
  return toProject(await window.desk.restoreProject())
}

export async function listProjects(): Promise<Project[]> {
  const found = await window.desk.listProjects()
  return found.map((one) => ({ id: one.id, name: one.name, path: one.path }))
}

// The folder is chosen in main's dialog, the same as a project folder is: only
// a path that came back from there is one main will take.
export async function addProjectDir(id: string): Promise<Project | null> {
  const path = await window.desk.pickProjectDir()
  if (path === null) return null
  return toProject(await window.desk.addProjectDir(id, path))
}

export async function removeProjectDir(id: string, path: string): Promise<Project | null> {
  return toProject(await window.desk.removeProjectDir(id, path))
}

export async function openProject(id: string): Promise<Project | null> {
  return toProject(await window.desk.openProject(id))
}

export async function forgetProject(id: string): Promise<void> {
  return window.desk.forgetProject(id)
}
