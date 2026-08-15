import type { PluginScope } from '../catalog/catalog.types'

export function whereLine(scope: PluginScope): string | null {
  switch (scope) {
    case 'user':
      return 'for you'
    case 'managed':
      return 'set by your organisation'
    case 'project':
      return 'for this project'
    default:
      return null
  }
}

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
