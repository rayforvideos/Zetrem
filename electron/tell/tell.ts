type Sink = { destroyed: boolean; writable: boolean; write(line: string): unknown }

export function canTell(stdin: Sink): boolean {
  return !stdin.destroyed && stdin.writable
}

export function tell(stdin: Sink, line: string): boolean {
  if (!canTell(stdin)) return false
  stdin.write(line)
  return true
}
