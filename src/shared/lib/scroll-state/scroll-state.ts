export const AT_END_SLACK_PX = 8

export function atEnd(scrollTop: number, scrollHeight: number, clientHeight: number): boolean {
  if (scrollHeight <= clientHeight) return true
  return scrollHeight - clientHeight - scrollTop <= AT_END_SLACK_PX
}
