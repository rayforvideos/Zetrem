import { i18n } from '@lingui/core'
import type { ChatSummary } from '@/entities/conversation'
import { cn } from '@/shared/lib/cn'
import { groupChats } from '../../lib/chat-groups/chat-groups'
import { Row } from './ChatRow'
import type { RowKit } from './ChatList.types'

export function Grouped({
  chats,
  kit,
  headClass,
}: {
  chats: ChatSummary[]
  kit: RowKit
  headClass: string
}) {
  return (
    <>
      {groupChats(chats, kit.nowMs).map((group) => (
        <div key={group.label.message} className="flex flex-col">
          <div className={cn(headClass, 'mb-0.5 px-2 text-xs tracking-wide text-muted-foreground')}>
            {i18n._(group.label)}
          </div>
          {group.chats.map((chat) => (
            <Row key={chat.id} chat={chat} kit={kit} />
          ))}
        </div>
      ))}
    </>
  )
}
