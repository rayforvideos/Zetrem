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
  // What the running session is on, when the person has picked something else.
  // The chip names it first, because it is the one that decides, and turns to
  // a warning until a new session catches the pick up.
  inForce?: string | null
  // Replaces the running session with one on the pick. Offered at the top of
  // the menu whenever `inForce` is set: with the two apart, restarting is the
  // only thing this picker can do that changes anything now.
  onRestart?(): void
}
