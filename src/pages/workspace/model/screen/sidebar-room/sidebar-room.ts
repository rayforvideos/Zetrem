export const MIN_TALK_PX = 460

export function sidebarFits(viewportW: number, span: number): boolean {
  if (viewportW <= 0) return true
  return viewportW - span >= MIN_TALK_PX
}

export function sidebarShows(wanted: boolean, forced: boolean, fits: boolean): boolean {
  return fits ? wanted : forced
}

// Opened by hand where it does not fit, the sidebar lies over the conversation
// instead of squeezing it: it takes no room, and it is floating.
export function sidebarFloats(open: boolean, fits: boolean): boolean {
  return open && !fits
}

export function sidebarSpan(open: boolean, fits: boolean, width: number, gap: number): number {
  return open && fits ? width + gap : 0
}
