import type { ReadingPath } from './reading.types'

export const READABLE = ['md', 'mdx', 'txt', 'json', 'yaml', 'yml'] as const

export function readable(path: string): boolean {
  const dot = path.lastIndexOf('.')
  if (dot === -1) return false
  return (READABLE as readonly string[]).includes(path.slice(dot + 1).toLowerCase())
}

export function shortPath(path: string, project: string | null): string {
  if (project === null || project.length === 0) return path
  const root = project.endsWith('/') ? project : `${project}/`
  return path.startsWith(root) ? path.slice(root.length) : path
}

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
