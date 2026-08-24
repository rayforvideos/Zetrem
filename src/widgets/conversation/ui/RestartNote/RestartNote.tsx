import { RotateCcw } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { t } from '@lingui/core/macro'

// A settings change no longer stops a running session; this note carries the
// change and the restart, the way a teammate change always has.
export function RestartNote({ said, onRestart }: { said: string; onRestart(): void }) {
  return (
    <div data-restart-note className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1 py-1">
      <p className="text-xs leading-snug text-muted-foreground">{said}</p>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRestart}
        className="h-7 rounded-lg border border-border px-2.5 text-xs"
        title={t`Stop the running session so the next message starts one that follows the change`}
      >
        <RotateCcw className="size-3.5" />
        {t`Restart session`}
      </Button>
    </div>
  )
}
