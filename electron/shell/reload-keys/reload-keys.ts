import type { ReloadKind, StrokeAsk } from './reload-keys.types'

// A window without a menu hears no accelerators, so the reload chords are
// read off the wire: Ctrl+R and F5, with Shift meaning past the cache.
export function reloadAsk(input: StrokeAsk): ReloadKind | null {
  if (input.type !== 'keyDown') return null
  const key = input.key.toLowerCase()
  if (key === 'f5' && !input.control && !input.alt && !input.meta) {
    return input.shift ? 'hard' : 'plain'
  }
  if (key === 'r' && input.control && !input.alt && !input.meta) {
    return input.shift ? 'hard' : 'plain'
  }
  return null
}
