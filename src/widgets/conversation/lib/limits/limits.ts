import { plural } from '@lingui/core/macro'

export const TOOL_OUTPUT_LINES = 400

export function moreLine(rest: number): string {
  return `… ${plural(rest, { one: '# more line', other: '# more lines' })}`
}

export function heldLine(held: number): string {
  return plural(held, { one: '# line', other: '# lines' })
}
