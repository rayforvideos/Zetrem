import type { Attached } from '@/entities/attachment'

export type Attempt = {
  prompt: string
  files: Attached[]
  resumed: boolean
  spoke: boolean
}
