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

// A Korean IME hands the same Enter over twice, once to finish the syllable and once
// as the key, so the owed send has to survive until one of them clears it.
export function endedComposing(composer: Composer): boolean {
  composer.composing = false
  return composer.wanted
}

export function takeOwed(composer: Composer): boolean {
  const owed = composer.wanted
  composer.wanted = false
  return owed
}

export function sent(composer: Composer): void {
  composer.wanted = false
}

type Press = { key: string; shift: boolean; alt: boolean; mod: boolean }

export function sendKey(press: Press, enterSends: boolean): boolean {
  if (press.key !== 'Enter') return false
  if (press.mod) return true
  return enterSends && !press.shift && !press.alt
}
