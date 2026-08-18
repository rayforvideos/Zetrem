import { plural } from '@lingui/core/macro'

export const TOOL_OUTPUT_LINES = 400

export function moreLine(rest: number): string {
  return `… ${plural(rest, { one: '# more line', other: '# more lines' })}`
}
