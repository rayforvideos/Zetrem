import type { ReadingPath } from './reading.types'

// What a teammate can be told to read first. The picker filters by these, and
// so does a drop, or a dragged screenshot would land in the reading list.
export const READABLE = ['md', 'mdx', 'txt', 'json', 'yaml', 'yml'] as const

export function readable(path: string): boolean {
  const dot = path.lastIndexOf('.')
  if (dot === -1) return false
  return (READABLE as readonly string[]).includes(path.slice(dot + 1).toLowerCase())
}

// A path inside the project reads better relative to it; one outside would come
// back as a stack of ../ that says nothing about where the file is, so it keeps
// its full path instead.
export function shortPath(path: string, project: string | null): string {
  if (project === null || project.length === 0) return path
  const root = project.endsWith('/') ? project : `${project}/`
  return path.startsWith(root) ? path.slice(root.length) : path
}

// Two lines for a row: the file, and where it lives. A reading list of five
// SKILL.md is unreadable until the folder is the part that differs.
export function readingPath(path: string): ReadingPath {
  const cut = path.lastIndexOf('/')
  if (cut === -1) return { name: path, where: '' }
  return { name: path.slice(cut + 1), where: path.slice(0, cut) }
}

export function addReading(held: string[], adding: string[]): string[] {
  const out = [...held]
  for (const path of adding) {
    if (path.length === 0 || !readable(path) || out.includes(path)) continue
    out.push(path)
  }
  return out
}
