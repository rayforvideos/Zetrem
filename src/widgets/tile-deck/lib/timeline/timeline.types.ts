import type { Call, TranscriptEntry } from '@/entities/agent-session'

export type TimelineItem = { kind: 'said'; entry: TranscriptEntry } | { kind: 'call'; call: Call }
