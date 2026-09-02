// Whether a session may be replaced wholesale by a saved transcript. A
// session that is already running, or already carries turns on screen, must
// never be overwritten by a disk read that started before either was true.
export function mayRestore(at: { running: boolean; turnCount: number }): boolean {
  return !at.running && at.turnCount === 0
}
