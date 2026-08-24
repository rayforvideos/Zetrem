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

// The composition is over, and this says whether a send is still owed for it.
// It leaves the debt standing: the send it answers is deferred, and whoever
// actually runs it takes the debt then. A Korean IME hands the same Enter over
// twice — once to finish the syllable, once as the key — and the second press
// sends before the deferred one gets its turn, so the debt has to survive long
// enough for that send to clear it.
export function endedComposing(composer: Composer): boolean {
  composer.composing = false
  return composer.wanted
}

// Claims the owed send. Anything that already sent has cleared the debt, so a
// deferred flush finds nothing and stays put rather than sending twice.
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
