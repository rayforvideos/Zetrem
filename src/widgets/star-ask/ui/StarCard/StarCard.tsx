import { t } from '@lingui/core/macro'
import { spriteSrc } from '@/entities/teammate'
import { Button } from '@/shared/ui/button'

// The star character asks for the star: the one toast in the app with a face,
// laid out like the update card so the two read as a family.
export function StarCard({ onStar, onLater }: { onStar(): void; onLater(): void }) {
  return (
    <div
      data-star-card
      className="flex w-[356px] items-center gap-3 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg"
    >
      <img src={spriteSrc('star', 'relax')} alt="" width={40} height={40} className="flex-none" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium">{t`Is Zetrem earning its keep?`}</span>
        <span className="text-xs leading-snug text-muted-foreground">
          {t`A star on GitHub goes a long way.`}
        </span>
      </div>
      <div className="flex flex-none flex-col gap-1.5">
        <Button size="sm" onClick={onStar}>{t`Star it`}</Button>
        <Button size="sm" variant="ghost" onClick={onLater}>{t`Not now`}</Button>
      </div>
    </div>
  )
}
