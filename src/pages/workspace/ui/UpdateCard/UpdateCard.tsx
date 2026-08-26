import { t } from '@lingui/core/macro'
import bunny from '@/entities/teammate/ui/AgentSprite/sprites/default/bunny_default.png'
import { Button } from '@/shared/ui/button'

export function UpdateCard({
  version,
  onRestart,
  onLater,
}: {
  version: string
  onRestart(): void
  onLater(): void
}) {
  return (
    <div className="flex w-[356px] items-center gap-3 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg">
      <img src={bunny} alt="" width={32} height={32} className="flex-none" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium">{t`Zetrem ${version} is ready`}</span>
        <span className="text-xs text-muted-foreground">{t`It installs when the app restarts.`}</span>
      </div>
      <div className="flex flex-none flex-col gap-1.5">
        <Button size="sm" onClick={onRestart}>{t`Restart`}</Button>
        <Button size="sm" variant="ghost" onClick={onLater}>{t`Later`}</Button>
      </div>
    </div>
  )
}
