// The one way text leaves the app for the clipboard. It answers whether the
// write landed rather than throwing, because every caller has the same thing
// to say when it does not: tell the person, and carry on.
export async function copyText(text: string): Promise<boolean> {
  const board = globalThis.navigator?.clipboard
  if (board === undefined) return false
  try {
    await board.writeText(text)
    return true
  } catch {
    return false
  }
}
