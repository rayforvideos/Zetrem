import type { ReactNode } from 'react'
import type { Said } from '@/shared/lib/say/read.types'

type Choice = { id: string; label: Said; hint: Said }

export type ChoicePickerProps = {
  icon?: ReactNode
  options: Choice[]
  selected: string
  onSelect(id: string): void
  label: string
  note?: string | null
}
