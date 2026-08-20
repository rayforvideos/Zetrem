import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'

const YOU = '{you}'

const GREETINGS = [
  msg`Let's get to work with your cute little agents!`,
  msg`{you}, who should take this one?`,
  msg`Say the word and the whole team wakes up.`,
  msg`The team is warm and waiting, {you}.`,
  msg`Big job? Split it. They like company.`,
  msg`They read fast and they never get bored.`,
  msg`Point at a problem, {you}. They will pile on.`,
  msg`One of you writes, one of you checks. Deal?`,
] as const

export const GREETING_MS = 6000

export function greetingsFor(name: string): string[] {
  const lines = name.length === 0 ? GREETINGS.filter((line) => !(line.message ?? '').includes(YOU)) : GREETINGS
  return lines.map((line) => i18n._(line.id, { you: name }, { message: line.message }))
}

export function greetingAt(tick: number, name = ''): string {
  const lines = greetingsFor(name)
  const size = lines.length
  return lines[((tick % size) + size) % size]!
}
