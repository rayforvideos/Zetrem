import type { StatusState } from '@/entities/agent-session'
import { useScrollState } from '@/shared/lib/scroll-state/use-scroll-state'
import { ChatList } from '../ChatList/ChatList'
import type { ChatListProps } from '../ChatList/ChatList.types'
import { SidebarGrip } from '../SidebarGrip/SidebarGrip'
import { StockList } from '../StockList/StockList'
import type { StockListProps } from '../StockList/StockList.types'
import { TeamList } from '../TeamList/TeamList'
import type { TeamListProps } from '../TeamList/TeamList.types'
import { UsagePanel } from '../UsagePanel/UsagePanel'

const AVATAR = 24

type TeamSidebarProps = {
  chats: Omit<ChatListProps, 'nowMs'>
  team: Omit<TeamListProps, 'avatar'>
  stock: Omit<StockListProps, 'avatar'>
  status: StatusState
  nowMs: number
  width: number
  onResize(width: number): void
  onResizeEnd(width: number): void
}

export function TeamSidebar({
  chats,
  team,
  stock,
  status,
  nowMs,
  width,
  onResize,
  onResizeEnd,
}: TeamSidebarProps) {
  const [column] = useScrollState<HTMLDivElement>()

  return (
    <aside
      style={{ width }}
      className="zt-bleed relative flex flex-none flex-col overflow-hidden border-r border-border bg-card/40"
    >
      <SidebarGrip width={width} onResize={onResize} onResizeEnd={onResizeEnd} />

      <div
        ref={column}
        className="zt-scroll zt-fade-out flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto pr-3"
      >
        <ChatList {...chats} nowMs={nowMs} />

        <Heading>Your team</Heading>
        <TeamList {...team} avatar={AVATAR} />

        <Heading>Claude Code</Heading>
        <StockList {...stock} avatar={AVATAR} />
      </div>

      <UsagePanel status={status} sessionLive={team.sessionLive} avatar={AVATAR} />
    </aside>
  )
}

function Heading({ children }: { children: string }) {
  return (
    <div className="mt-2 border-t border-border px-2 pt-4 text-xs tracking-wide text-muted-foreground">
      {children}
    </div>
  )
}
