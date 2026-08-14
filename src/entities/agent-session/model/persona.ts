export type Persona = {
  name: string
  hue: number
  face: number
}

const FACES = 4

function hash(text: string): number {
  let value = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i)
    value = Math.imul(value, 0x01000193)
  }
  return value >>> 0
}

function bareName(type: string): string {
  const tail = type.includes(':') ? type.slice(type.lastIndexOf(':') + 1) : type
  return tail
    .split(/[-_]/)
    .filter((word) => word.length > 0)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(' ')
}

export function personaOf(subagentType: string): Persona {
  const seed = hash(subagentType)
  return {
    name: bareName(subagentType) || 'Subagent',
    hue: Math.round((seed * 137.508) % 360),
    face: seed % FACES,
  }
}
