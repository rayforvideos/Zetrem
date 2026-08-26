import { StockList } from '@/entities/teammate'
import type { StockListProps } from '@/entities/teammate'
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { SIDEBAR } from '@/shared/config/theme'
import { cn } from '@/shared/lib/cn'
import { useScrollState } from '@/shared/lib/scroll-state/useScrollState'
import { Button } from '@/shared/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible'
import { ChatList } from '../ChatList/ChatList'
import type { ChatListProps } from '../ChatList/ChatList.types'
import { SidebarGrip } from '../SidebarGrip/SidebarGrip'
import { ProjectSwitcher } from '../ProjectSwitcher/ProjectSwitcher'
import type { ProjectsProps } from '../ProjectSwitcher/ProjectSwitcher.types'
import { TeamList } from '../TeamList/TeamList'
import type { TeamListProps } from '../TeamList/TeamList.types'
import { t } from '@lingui/core/macro'

const AVATAR = 24

type TeamSidebarProps = {
  projects: ProjectsProps
  chats: Omit<ChatListProps, 'nowMs'>
  team: Omit<TeamListProps, 'avatar'>
  agents: Omit<StockListProps, 'avatar'>
  nowMs: number
  width: number
  onResize(width: number): void
  onResizeEnd(width: number): void
}

export function TeamSidebar({
  projects,
  chats,
  team,
  agents,
  nowMs,
  width,
  onResize,
  onResizeEnd,
}: TeamSidebarProps) {
  const [column] = useScrollState<HTMLDivElement>()

  return (
    <aside
      style={{ width, paddingLeft: SIDEBAR.gutter }}
      className="zt-bleed relative flex flex-none flex-col overflow-hidden border-r border-border bg-card/40"
    >
      <SidebarGrip width={width} onResize={onResize} onResizeEnd={onResizeEnd} />

      <div
        ref={column}
        className="zt-scroll zt-fade-out -mx-1 -mt-1 flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto px-1 pt-1 pr-5"
      >
        <ProjectSwitcher projects={projects} />

        <ChatList {...chats} nowMs={nowMs} />

        <Heading>{t`Your team`}</Heading>
        <TeamList {...team} avatar={AVATAR} />

        <Heading>{t`Claude Code`}</Heading>
        <BuiltinAgents agents={agents} />
      </div>
    </aside>
  )
}

// On or off is decided once and rarely touched, so the rows sit shut behind
// their tally and unfold where they stand, instead of taking a line each.
function BuiltinAgents({ agents }: { agents: Omit<StockListProps, 'avatar'> }) {
  const [open, setOpen] = useState(false)
  const using = agents.stock.filter((name) => agents.on.includes(name)).length

  if (agents.stock.length === 0) {
    return (
      <p data-stock-empty className="px-2 text-xs leading-snug text-muted-foreground">
        {t`Reading which agents Claude Code brings. They will be listed here.`}
      </p>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col gap-0.5">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="bare"
          className="h-8 w-full min-w-0 justify-start gap-1.5 rounded-lg px-2 text-left text-sm text-muted-foreground"
        >
          <span className="truncate">{t`${using} of ${agents.stock.length} agents on`}</span>
          <ChevronRight
            className={cn('size-3.5 flex-none transition-transform', open && 'rotate-90')}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <StockList {...agents} avatar={24} />
      </CollapsibleContent>
    </Collapsible>
  )
}

function Heading({ children }: { children: string }) {
  return <div className="mt-7 px-2 text-xs tracking-wide text-muted-foreground">{children}</div>
}
