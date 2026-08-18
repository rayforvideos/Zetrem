import type { ChatSummary } from '@/entities/conversation'
import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import type { ChatGroup } from './chat-groups.types'

const DAY = 86_400_000

const BANDS: { label: MessageDescriptor; within: number }[] = [
  { label: msg`Today`, within: 1 },
  { label: msg`Yesterday`, within: 2 },
  { label: msg`Previous 7 days`, within: 8 },
  { label: msg`Previous 30 days`, within: 31 },
]

function daysBack(savedAtMs: number, nowMs: number): number {
  return Math.floor((startOfDay(nowMs) - startOfDay(savedAtMs)) / DAY)
}

function startOfDay(ms: number): number {
  const date = new Date(ms)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function bandOf(savedAtMs: number, nowMs: number): MessageDescriptor {
  const back = daysBack(savedAtMs, nowMs)
  const band = BANDS.find((entry) => back < entry.within)
  return band?.label ?? msg`Older`
}

export function groupChats(chats: ChatSummary[], nowMs: number): ChatGroup[] {
  const groups: ChatGroup[] = []
  for (const chat of chats) {
    const label = bandOf(chat.savedAtMs, nowMs)
    const last = groups.at(-1)
    if (last !== undefined && last.label.message === label.message) last.chats.push(chat)
    else groups.push({ label, chats: [chat] })
  }
  return groups
}
