import type { Project } from '../model/project'
import { baseName } from '@/shared/lib/base-name/base-name'

export async function pickProject(): Promise<Project | null> {
  return toProject(await window.desk.pickProjectDir())
}

export async function restoreProject(): Promise<Project | null> {
  return toProject(await window.desk.restoreProjectDir())
}

function toProject(path: string | null): Project | null {
  if (!path) return null
  return { path, name: baseName(path) }
}
