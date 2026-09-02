// Leaving a chat is only a change of what the screen shows. The session it
// leaves behind keeps its process; nothing here may stop one.
export function leaving(prev: string | null, next: string): 'stay' | 'switch' {
  return prev === next ? 'stay' : 'switch'
}
