import type { Settings } from '@/entities/agent-session'

export type Held = { next: Settings; save: boolean; waiting: Partial<Settings> }

export type Landed = { next: Settings; save: boolean }
