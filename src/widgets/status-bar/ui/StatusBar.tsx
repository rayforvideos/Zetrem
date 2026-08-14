import { ChevronDown, ChevronUp } from 'lucide-react'
import { MODELS, PERMISSION_MODES } from '@/entities/agent-session'
import type { ModelChoice, PermissionMode, StatusState } from '@/entities/agent-session'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { cells } from '../lib/format'

type StatusBarProps = {
  status: StatusState
  open: boolean
  onToggle(): void
  permissionMode: PermissionMode
  model: ModelChoice
  onModel(model: ModelChoice): void
  sessionLive: boolean
  variant?: 'bar' | 'quiet'
}

export function StatusBar({
  status,
  open,
  onToggle,
  permissionMode,
  model,
  onModel,
  sessionLive,
  variant = 'bar',
}: StatusBarProps) {
  const quiet = variant === 'quiet'
  const items = quiet ? [] : cells(status)

  return (
    <div className="flex flex-none flex-col gap-1.5">
      {!quiet && <div className="h-px w-full bg-current opacity-15" />}
      <div
        className={cn(
          'flex items-center font-mono tracking-wide',
          quiet ? 'justify-center gap-2 text-[10.5px] opacity-70' : 'gap-2.5 text-[10.5px]',
        )}
      >
        <span className="flex-none opacity-70" title={hintOf(PERMISSION_MODES, permissionMode)}>
          {labelOf(PERMISSION_MODES, permissionMode)}
        </span>
        {quiet && <span className="flex-none opacity-30">·</span>}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="quiet" size="bare" className="flex-none font-mono opacity-70">
              {labelOf(MODELS, model)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {MODELS.map((choice) => (
              <DropdownMenuItem key={choice.id} onSelect={() => onModel(choice.id)}>
                <span className={cn(choice.id === model ? '' : 'opacity-45')}>
                  <span className="block text-[12.5px]">{choice.label}</span>
                  <span className="block text-[11px] leading-snug opacity-70">{choice.hint}</span>
                </span>
              </DropdownMenuItem>
            ))}
            {sessionLive && (
              <DropdownMenuLabel className="font-mono text-[10.5px] font-normal opacity-45">
                도는 세션은 그대로 — 다음 세션부터
              </DropdownMenuLabel>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div
          className={cn(
            'flex min-w-0 items-center gap-2.5 overflow-hidden',
            quiet ? 'flex-none' : 'flex-1',
          )}
        >
          {items.map((cell) => (
            <span
              key={cell.key}
              className={cn(
                'flex-none truncate tabular-nums',
                cell.warn ? 'opacity-100' : 'opacity-70',
              )}
            >
              {cell.text}
            </span>
          ))}
        </div>

        {!quiet && (
          <Button
            variant="quiet"
            size="bare"
            onClick={onToggle}
            aria-expanded={open}
            aria-label="세션 명세"
            className="flex-none"
          >
            {open ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
          </Button>
        )}
      </div>
    </div>
  )
}

function labelOf(options: { id: string; label: string }[], selected: string): string {
  return options.find((option) => option.id === selected)?.label ?? ''
}

function hintOf(options: { id: string; hint: string }[], selected: string): string {
  return options.find((option) => option.id === selected)?.hint ?? ''
}
