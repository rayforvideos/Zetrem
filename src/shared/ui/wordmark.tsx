import wordmarkUrl from '@/shared/assets/wordmark.png'
import { cn } from '@/shared/lib/cn'

const SOURCE = { width: 720, height: 298 }

export const WORDMARK_SIZE = {
  setup: 200,
  signature: 100,
} as const

export const WORDMARK_SIGNATURE_OPACITY = 'text-muted-foreground'

export function Wordmark({ width, className }: { width: number; className?: string }) {
  const height = Math.round((width / SOURCE.width) * SOURCE.height)
  return (
    <span
      role="img"
      aria-label="Zetrem"
      title="Zetrem"
      className={cn('block flex-none bg-current', className)}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        maskImage: `url(${wordmarkUrl})`,
        WebkitMaskImage: `url(${wordmarkUrl})`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
      }}
    />
  )
}
