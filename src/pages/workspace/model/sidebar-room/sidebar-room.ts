export const MIN_TALK_PX = 460

export function sidebarFits(viewportW: number, span: number): boolean {
  if (viewportW <= 0) return true
  return viewportW - span >= MIN_TALK_PX
}

export function sidebarShows(wanted: boolean, forced: boolean, fits: boolean): boolean {
  return fits ? wanted : forced
}
