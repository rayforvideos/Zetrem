import type { Composing, Field } from './settle.types'

export function settle(field: Field | null, composing: Composing): void {
  if (!composing.current || field === null) return
  composing.current = false
  field.blur()
  field.focus()
}
