import { fnv1a } from '@/shared/lib/fnv/fnv'
import type { Persona } from './persona.types'

const FACES = 4

function bareName(type: string): string {
  const tail = type.includes(':') ? type.slice(type.lastIndexOf(':') + 1) : type
  return tail
    .split(/[-_]/)
    .filter((word) => word.length > 0)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(' ')
}

export function personaOf(subagentType: string): Persona {
  const seed = fnv1a(subagentType)
  return {
    name: bareName(subagentType) || 'Subagent',
    hue: Math.round((seed * 137.508) % 360),
    face: seed % FACES,
  }
}
