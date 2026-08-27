import type { Project } from '../model/project'

type Stored = { id: string; name: string; path: string } | null

function toProject(stored: Stored): Project | null {
  if (!stored) return null
  return { id: stored.id, name: stored.name, path: stored.path }
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

export async function openProject(id: string): Promise<Project | null> {
  return toProject(await window.desk.openProject(id))
}

export async function forgetProject(id: string): Promise<void> {
  return window.desk.forgetProject(id)
}

export async function repathProject(id: string): Promise<Project | null> {
  const path = await window.desk.pickProjectDir()
  if (path === null) return null
  return toProject(await window.desk.repathProject(id, path))
}
