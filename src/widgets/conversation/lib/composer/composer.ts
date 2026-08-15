import type { Composer } from './composer.types'

export function newComposer(): Composer {
  return { composing: false, wanted: false }
}

export function beganComposing(composer: Composer): void {
  composer.composing = true
}

export function maySendNow(composer: Composer): boolean {
  if (!composer.composing) return true
  composer.wanted = true
  return false
}

export function endedComposing(composer: Composer): boolean {
  composer.composing = false
  const owed = composer.wanted
  composer.wanted = false
  return owed
}

export function sent(composer: Composer): void {
  composer.wanted = false
}
