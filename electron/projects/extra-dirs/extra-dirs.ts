import { realpathSync, statSync } from 'node:fs'
import type { DirDeps } from './extra-dirs.types'

const liveDirs: DirDeps = {
  realDir: (path) => {
    try {
      const real = realpathSync(path)
      return statSync(real).isDirectory() ? real : null
    } catch {
      return null
    }
  },
}

// The extra folders as the CLI will see them: real paths, each folder once,
// and nothing that has gone away since it was added. A symlink and its target
// are one folder to the CLI, so paths are resolved before they are compared,
// and the project's own folder is dropped because the session already runs
// there. What is stored is left alone: a folder on a drive that is not
// mounted today is not forgotten, it is only not passed today.
export function usableDirs(
  projectPath: string,
  dirs: readonly string[],
  deps: DirDeps = liveDirs,
): string[] {
  const home = deps.realDir(projectPath) ?? projectPath
  const kept: string[] = []
  const seen = new Set<string>([home])
  for (const dir of dirs) {
    const real = deps.realDir(dir)
    if (real === null || seen.has(real)) continue
    seen.add(real)
    kept.push(real)
  }
  return kept
}

export function addDirArgs(
  projectPath: string,
  dirs: readonly string[],
  deps: DirDeps = liveDirs,
): string[] {
  return usableDirs(projectPath, dirs, deps).flatMap((dir) => ['--add-dir', dir])
}

// A folder joins the list at the end, where it was added, under the real path
// so that the row shown and the argument passed are the same thing. One that
// adds nothing, because it is gone, is the project itself, or is already
// listed, is refused rather than stored to be dropped at every start.
export function withDir(
  projectPath: string,
  dirs: readonly string[],
  added: string,
  deps: DirDeps = liveDirs,
): string[] | null {
  const real = deps.realDir(added)
  if (real === null) return null
  const grown = usableDirs(projectPath, [...dirs, added], deps)
  if (grown.length === usableDirs(projectPath, dirs, deps).length) return null
  return [...dirs, real]
}

// Removal goes by what was stored and by what it resolves to, so a folder
// added under one path can still be taken away by the row the screen shows.
export function withoutDir(
  dirs: readonly string[],
  removed: string,
  deps: DirDeps = liveDirs,
): string[] {
  const real = deps.realDir(removed)
  return dirs.filter((dir) => dir !== removed && (real === null || deps.realDir(dir) !== real))
}
