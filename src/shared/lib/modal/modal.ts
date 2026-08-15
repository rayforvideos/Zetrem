export const LAYER_SELECTOR =
  '[role="dialog"], [role="alertdialog"], [role="menu"], [data-radix-popper-content-wrapper]'

export function layerOver(root: { querySelector(selector: string): unknown }): boolean {
  return root.querySelector(LAYER_SELECTOR) !== null
}
