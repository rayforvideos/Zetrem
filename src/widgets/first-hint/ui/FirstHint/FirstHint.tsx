import type { CSSProperties } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/shared/ui/button'

export function FirstHint({
  title,
  body,
  onClose,
}: {
  title: string
  body: string
  onClose(): void
}) {
  return (
    <div data-hint className="zt-rise flex items-start gap-2 rounded-xl bg-card px-3 py-2.5" style={rootStyle}>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-sm leading-tight">{title}</span>
        <span className="text-xs leading-snug text-muted-foreground">{body}</span>
      </span>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onClose}
        aria-label="Dismiss this tip"
        className="-mt-0.5 flex-none rounded-full text-muted-foreground"
      >
        <X />
      </Button>
    </div>
  )
}

const rootStyle: CSSProperties = {
  border: '1px solid var(--color-border)',
  boxShadow: '0 16px 40px -24px rgb(0 0 0 / 0.9)',
}
