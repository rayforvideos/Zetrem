const YOU = '{you}'

const GREETINGS = [
  "Let's get to work with your cute little agents!",
  `${YOU}, who should take this one?`,
  'Say the word and the whole team wakes up.',
  `The team is warm and waiting, ${YOU}.`,
  'Big job? Split it. They like company.',
  'They read fast and they never get bored.',
  `Point at a problem, ${YOU}. They will pile on.`,
  'One of you writes, one of you checks. Deal?',
] as const

export const GREETING_MS = 6000

export function greetingsFor(name: string): string[] {
  if (name.length === 0) return GREETINGS.filter((line) => !line.includes(YOU))
  return GREETINGS.map((line) => line.replaceAll(YOU, name))
}

export function greetingCount(name = ''): number {
  return greetingsFor(name).length
}

export function greetingAt(tick: number, name = ''): string {
  const lines = greetingsFor(name)
  const size = lines.length
  return lines[((tick % size) + size) % size]!
}
