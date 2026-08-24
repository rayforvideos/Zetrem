import type { Project } from '../model/project'
import { baseName } from '@/shared/lib/base-name/base-name'

export async function pickProject(): Promise<Project | null> {
  return toProject(await window.desk.pickProjectDir())
}

export async function restoreProject(): Promise<Project | null> {
  return toProject(await window.desk.restoreProjectDir())
}

export async function recentProjects(): Promise<Project[]> {
  const paths = await window.desk.recentProjectDirs()
  return paths.map((path) => ({ path, name: baseName(path) }))
}

export async function chooseProject(path: string): Promise<Project | null> {
  return toProject(await window.desk.chooseProjectDir(path))
}

function toProject(path: string | null): Project | null {
  if (!path) return null
  return { path, name: baseName(path) }
}
