import type { ReactNode } from 'react'
import type { VaultNote } from '@/entities/vault'

export type NoteEditorProps = {
  note: VaultNote
  title: string
  onChange(text: string): void
  onTitle(title: string): Promise<boolean>
  guide: boolean
  fresh: boolean
  meta: ReactNode
  actions: ReactNode
}
