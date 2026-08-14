import type { Project } from '../model/project'

export async function pickProject(): Promise<Project | null> {
  return toProject(await window.desk.pickProjectDir())
}

export async function restoreProject(): Promise<Project | null> {
  return toProject(await window.desk.restoreProjectDir())
}

function toProject(path: string | null): Project | null {
  if (!path) return null
  return { path, name: path.split('/').at(-1) ?? path }
}
