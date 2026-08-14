import type { ReactNode } from 'react'

export type Choice = { id: string; label: string; hint: string }

export type ChoicePickerProps = {
  icon?: ReactNode
  options: Choice[]
  selected: string
  onSelect(id: string): void
  label: string
  note?: string | null
}
