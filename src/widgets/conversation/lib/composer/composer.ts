import type { Composer } from './composer.types'

export function newComposer(): Composer {
  return { composing: false, sentWhileComposing: false }
}

export function beganComposing(composer: Composer): void {
  composer.composing = true
}

export function sent(composer: Composer): void {
  composer.sentWhileComposing = composer.composing
}

export function endedComposing(composer: Composer): boolean {
  composer.composing = false
  const owed = composer.sentWhileComposing
  composer.sentWhileComposing = false
  return owed
}
