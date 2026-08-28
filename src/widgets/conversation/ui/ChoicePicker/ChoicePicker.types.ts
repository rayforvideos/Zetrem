import type { ReactNode } from 'react'
import type { Said } from '@/shared/lib/say/read.types'

type Choice = { id: string; label: Said; hint: Said }

// A second, smaller choice that rides under the first: the effort under the model.
export type SubChoice = {
  icon?: ReactNode
  label: string
  options: Choice[]
  selected: string
  onSelect(id: string): void
}

export type ChoicePickerProps = {
  icon?: ReactNode
  options: Choice[]
  selected: string
  onSelect(id: string): void
  label: string
  note?: string | null
  sub?: SubChoice
}
