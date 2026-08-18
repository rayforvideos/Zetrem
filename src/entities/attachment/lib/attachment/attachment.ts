import { baseName } from '@/shared/lib/base-name/base-name'
import type { AttachKind, Attached, Sent } from './attachment.types'

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024

const IMAGE_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
}

export function nameOf(path: string): string {
  return baseName(path)
}

export function imageTypeOf(path: string): string | null {
  const dot = nameOf(path).lastIndexOf('.')
  if (dot < 0) return null
  return IMAGE_TYPES[nameOf(path).slice(dot + 1).toLowerCase()] ?? null
}

export function kindOf(path: string): AttachKind {
  return imageTypeOf(path) === null ? 'file' : 'image'
}

export function tooHeavy(file: { kind: AttachKind; bytes: number }): boolean {
  return file.kind === 'image' && file.bytes > IMAGE_MAX_BYTES
}

export function sentOf(files: Attached[]): Sent[] {
  return files.map((file) => ({ name: file.name, kind: file.kind, path: file.path }))
}

export function pathsLine(files: Attached[]): string {
  const paths = files.filter((file) => file.kind === 'file').map((file) => file.path)
  if (paths.length === 0) return ''
  return `\n\nAttached, read them if they matter:\n${paths.join('\n')}`
}

export function withPaths(text: string, files: Attached[]): string {
  return `${text}${pathsLine(files)}`
}

export function alreadyHeld(files: Attached[], path: string): boolean {
  return files.some((file) => file.path === path)
}
