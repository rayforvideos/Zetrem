import type { FaceId } from './face.types'

export const FACES: readonly FaceId[] = ['onigiri', 'triangle', 'ghost', 'spike', 'capsule']

const NAME_MAX = 24

export function isFaceId(value: unknown): value is FaceId {
  return typeof value === 'string' && FACES.includes(value as FaceId)
}

export function tidyUserName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX)
}
