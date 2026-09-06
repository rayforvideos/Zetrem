export const LAYER_SELECTOR =
  '[role="dialog"], [role="alertdialog"], [role="menu"], [data-radix-popper-content-wrapper]'

export function layerOver(root: { querySelector(selector: string): unknown }): boolean {
  return root.querySelector(LAYER_SELECTOR) !== null
}

// Whether a key was pressed into something being written in. A field with the
// caret in it has the nearer claim on Escape: emptying a search box or
// dropping a half-typed title is what the person means, not leaving the screen
// that box sits on.
export function typingIn(
  target: { tagName?: string; isContentEditable?: boolean } | null,
): boolean {
  if (target === null) return false
  return (
    target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable === true
  )
}
