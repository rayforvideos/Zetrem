const GREETINGS = [
  "Let's get to work with your cute little agents!",
  'Say the word and the whole team wakes up.',
  'Who should take this one?',
  'Big job? Split it. They like company.',
  'They read fast and they never get bored.',
  'Point at a problem. They will pile on.',
  'One of you writes, one of you checks. Deal?',
  'The team is warm and waiting.',
] as const

export const GREETING_MS = 6000

export function greetingCount(): number {
  return GREETINGS.length
}

export function greetingAt(tick: number): string {
  const size = GREETINGS.length
  return GREETINGS[((tick % size) + size) % size]!
}
