import type { StockListProps } from './StockList.types'
import { personaOf } from '@/entities/agent-session'
import { AgentSprite } from '@/entities/agent-session/ui/AgentSprite/AgentSprite'
import { cn } from '@/shared/lib/cn'
import { Switch } from '@/shared/ui/switch'


export function StockList({ stock, on, avatar, onChange }: StockListProps) {
  if (stock.length === 0) {
    return (
      <p data-stock-empty className="px-2 text-xs leading-snug text-muted-foreground">
        Reading which agents Claude Code brings. They will be listed here.
      </p>
    )
  }
  const held = new Set(on)

  return (
    <div className="flex flex-col gap-0.5">
      {stock.map((name) => {
        const callable = held.has(name)
        return (
          <label
            key={name}
            className={cn(
              'flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5',
              callable ? 'text-foreground' : 'text-muted-foreground',
            )}
            title={
              callable
                ? `${name} can be called this session`
                : `Turn on to let the team call ${name}`
            }
          >
            <AgentSprite
              subagentType={name}
              size={avatar}
              className={cn(!callable && 'grayscale')}
            />
            <span className="min-w-0 flex-1 truncate text-sm leading-tight">
              {personaOf(name).name}
            </span>
            <Switch
              checked={callable}
              onCheckedChange={(next) => onChange(name, next)}
              aria-label={personaOf(name).name}
            />
          </label>
        )
      })}
    </div>
  )
}
