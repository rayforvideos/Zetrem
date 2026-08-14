import { useEffect } from 'react'
import type { PermissionAsk } from '@/entities/agent-session'
import { toolShape } from '@/shared/lib/tool-shape/tool-shape'
import { modifierKey } from '@/shared/lib/platform/platform'
import { Button } from '@/shared/ui/button'
import { Kbd, KbdGroup } from '@/shared/ui/kbd'
import { ToolIcon } from '@/shared/graphics/tool-icon'

export function Approval({
  ask,
  onDecide,
}: {
  ask: PermissionAsk
  onDecide(allow: boolean, always?: boolean): void
}) {
  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent): void {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        onDecide(true)
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        onDecide(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDecide])

  const shape = toolShape(ask.toolName, null)

  return (
    <div
      data-approval
      className="flex flex-none flex-col gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-baseline gap-2">
        <span className="text-base">{verbOf(ask.toolName)}</span>
        <span className="font-mono text-xs text-muted-foreground">{ask.toolName}</span>
      </div>

      <div
        data-selectable
        className="flex items-start gap-2 font-mono text-sm [overflow-wrap:anywhere]"
      >
        <span className="mt-[3px] flex-none text-muted-foreground">
          <ToolIcon shape={shape} />
        </span>
        <span>{ask.line}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => onDecide(true)} className="rounded-full">
          Allow
          <KbdGroup>
            <Kbd className="bg-primary-foreground/15 text-primary-foreground/70">
              {modifierKey()}
            </Kbd>
            <Kbd className="bg-primary-foreground/15 text-primary-foreground/70">Enter</Kbd>
          </KbdGroup>
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onDecide(false)} className="rounded-full">
          Deny
          <Kbd>Esc</Kbd>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDecide(true, true)}
          className="rounded-full text-muted-foreground"
        >
          Don't ask again this session
        </Button>
      </div>
    </div>
  )
}

function verbOf(toolName: string): string {
  switch (toolName) {
    case 'Bash':
      return 'Run this command?'
    case 'Write':
      return 'Write this file?'
    case 'Edit':
    case 'MultiEdit':
      return 'Edit this file?'
    case 'WebFetch':
    case 'WebSearch':
      return 'Reach out to the web?'
    default:
      return 'Allow this?'
  }
}
