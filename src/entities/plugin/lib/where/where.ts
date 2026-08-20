import type { PluginScope } from '../catalog/catalog.types'

export function appliesHere(
  scope: PluginScope,
  projectPath: string | null,
  openProject: string | null,
): boolean {
  if (scope !== 'project') return true
  return projectPath === null || openProject === null || projectPath === openProject
}

export function switchableHere(
  scope: PluginScope,
  projectPath: string | null,
  openProject: string | null,
): boolean {
  if (scope === 'managed') return false
  return appliesHere(scope, projectPath, openProject)
}

export function removableHere(
  scope: PluginScope,
  projectPath: string | null,
  openProject: string | null,
): boolean {
  if (scope === 'managed' || scope === 'unknown') return false
  return appliesHere(scope, projectPath, openProject)
}
