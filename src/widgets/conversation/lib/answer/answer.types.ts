import type { ToolActivity } from '@/entities/conversation'

export type AnswerPart = { kind: 'text'; text: string } | { kind: 'run'; tools: ToolActivity[] }
