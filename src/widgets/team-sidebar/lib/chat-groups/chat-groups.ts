import type { ChatSummary } from '@/entities/conversation'
import type { ChatGroup } from './chat-groups.types'

const DAY = 86_400_000

const BANDS: { label: string; within: number }[] = [
  { label: 'Today', within: 1 },
  { label: 'Yesterday', within: 2 },
  { label: 'Previous 7 days', within: 8 },
  { label: 'Previous 30 days', within: 31 },
]

function daysBack(savedAtMs: number, nowMs: number): number {
  return Math.floor((startOfDay(nowMs) - startOfDay(savedAtMs)) / DAY)
}

function startOfDay(ms: number): number {
  const date = new Date(ms)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function bandOf(savedAtMs: number, nowMs: number): string {
  const back = daysBack(savedAtMs, nowMs)
  const band = BANDS.find((entry) => back < entry.within)
  return band?.label ?? 'Older'
}

export function groupChats(chats: ChatSummary[], nowMs: number): ChatGroup[] {
  const groups: ChatGroup[] = []
  for (const chat of chats) {
    const label = bandOf(chat.savedAtMs, nowMs)
    const last = groups.at(-1)
    if (last !== undefined && last.label === label) last.chats.push(chat)
    else groups.push({ label, chats: [chat] })
  }
  return groups
}
