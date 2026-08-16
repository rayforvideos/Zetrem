import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { WORDMARK_SIZE, Wordmark } from '@/shared/graphics/wordmark/wordmark'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { fitScale } from '../../lib/fit/fit'
import { SLIDES, lastSlide, stepTo } from '../../lib/slides/slides'
import { MockScreen } from '../MockScreen/MockScreen'

const SENDOFF_MS = 1150

const TEXT_ROOM = 170

const SIDE_ROOM = 24

export function WelcomePane({ onDone }: { onDone(): void }) {
  const [at, setAt] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const room = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.82)
  const slide = SLIDES[at]
  const end = lastSlide(at)

  const walk = useCallback((by: number) => setAt((was) => stepTo(was, by)), [])

  const finish = useCallback(() => setLeaving(true), [])

  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    if (!leaving) return undefined
    const timer = setTimeout(() => done.current(), SENDOFF_MS)
    return () => clearTimeout(timer)
  }, [leaving])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') return walk(1)
      if (event.key === 'ArrowLeft') return walk(-1)
      if (event.key === 'Escape') return onDone()
      if (event.key !== 'Enter') return
      if (lastSlide(at)) finish()
      else walk(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [at, walk, onDone, finish])

  useLayoutEffect(() => {
    const el = room.current
    if (el === null) return undefined
    const look = () => setScale(fitScale(el.clientWidth - SIDE_ROOM, el.clientHeight - TEXT_ROOM))
    look()
    const watched = new ResizeObserver(look)
    watched.observe(el)
    return () => watched.disconnect()
  }, [])

  if (leaving) {
    return (
      <div data-welcome="done" className="relative z-[3] flex h-full items-center justify-center">
        <Wordmark width={WORDMARK_SIZE.setup} className="zt-sendoff" />
      </div>
    )
  }

  if (slide === undefined) return null

  return (
    <div data-welcome={slide.key} className="relative z-[3] flex h-full min-h-0 flex-col">
      <div
        ref={room}
        className="zt-scroll flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-4"
      >
        <MockScreen focus={slide.focus} scale={scale} />

        <div key={slide.key} className="zt-enter flex max-w-[540px] flex-col gap-2.5 text-center">
          <h1 className="text-xl leading-tight">{slide.title}</h1>
          <p className="text-sm leading-relaxed break-keep text-muted-foreground">{slide.body}</p>
        </div>
      </div>

      <div className="flex-none">
        <div className="mx-auto flex w-full max-w-[760px] items-center gap-3 px-2 py-6">
          <span className="flex flex-1 justify-start">
            {!end && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDone}
                className="rounded-full text-muted-foreground"
              >
                Skip
              </Button>
            )}
          </span>

          <span data-dots className="flex flex-none items-center gap-1.5">
            {SLIDES.map((one, index) => (
              <Button
                key={one.key}
                variant="ghost"
                size="bare"
                onClick={() => setAt(index)}
                aria-label={one.title}
                aria-current={index === at}
                className="size-4 rounded-full"
              >
                <span
                  className={cn(
                    'size-1.5 rounded-full transition-colors',
                    index === at ? 'bg-foreground' : 'bg-border',
                  )}
                />
              </Button>
            ))}
          </span>

          <span className="flex flex-1 items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => walk(-1)}
              disabled={at === 0}
              aria-label="Back"
              className="rounded-full"
            >
              <ArrowLeft />
            </Button>
            {end ? (
              <Button onClick={finish} className="rounded-full px-5">
                Get started
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => walk(1)} className="rounded-full px-4">
                Next
                <ArrowRight />
              </Button>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
