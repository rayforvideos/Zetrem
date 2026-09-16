import type { CSSProperties } from 'react'
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useState,
  useSyncExternalStore,
} from 'react'
import { t } from '@lingui/core/macro'
import { MOTION } from '@/shared/config/motion/motion'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/cn'
import {
  SETTLE_FRAMES,
  TOUR,
  delayFor,
  isOnScreen,
  placeTooltip,
  spotlight,
  stepAfter,
  wantsNextButton,
} from './tour'
import type { Box, Size, TourPlacement, TourProps, TourSignal } from './tour.types'

// The card is measured as soon as it is on screen; this is only what the very
// first frame is placed against, and it matches the w-80 card below.
const FIRST_GUESS: Size = { width: 320, height: 168 }

// The tour sits over a live app, so the dark is drawn as four bands around the
// target rather than one sheet with a hole: the bands are what swallows a
// click meant for something the step is not about, and the target itself stays
// a real control the reviewer really presses.
export function TourOverlay({
  steps,
  onDone,
  onStepChange,
  waitMs = TOUR.waitForTargetMs,
}: TourProps) {
  const [at, setAt] = useState(0)
  const step = steps[at]
  const viewport = useViewport()
  const [card, measureCard] = useMeasured(FIRST_GUESS)
  const target = useTarget(step?.target ?? null, waitMs)

  function send(signal: TourSignal): void {
    const next = stepAfter(steps, at, signal)
    if (next === at) return
    if (next === null) {
      onDone(signal === 'skip' ? 'skipped' : signal === 'quit' ? 'quit' : 'finished')
      return
    }
    setAt(next)
  }

  // Effects raise signals too, and each of them would otherwise have to list
  // every step and prop that `send` reads: a timer that resubscribed on each
  // render would restart before it ever went off.
  const raise = useEffectEvent((signal: TourSignal) => {
    send(signal)
  })

  const opened = useEffectEvent(() => {
    if (step !== undefined) onStepChange?.(step, at)
  })

  useEffect(() => {
    opened()
  }, [at])

  // Esc is the way out of anything that covers the screen, and a demo a
  // reviewer cannot leave is worse than no demo.
  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') raise('quit')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const delay = step === undefined ? null : delayFor(step)
  const waiting = typeof step?.target === 'string' && target.node === null

  useEffect(() => {
    // A timed step starts counting when its target is actually there, or the
    // reviewer would be shown a sentence about something not on screen yet.
    if (delay === null || waiting) return
    const timer = setTimeout(() => raise('delay-done'), delay)
    return () => clearTimeout(timer)
  }, [at, delay, waiting])

  const node = target.node
  const onClickStep = step?.advance === 'click'
  const wanted = step?.target ?? null

  useEffect(() => {
    if (node === null || !onClickStep || wanted === null) return
    // Capture, so the step moves on even when the control stops the click on
    // its way up, and the control still gets the click of its own.
    //
    // Matched by the selector rather than against the one element that was
    // measured: a step may point at a row of things, and pressing the second
    // of them is as much an answer as pressing the first.
    function onClick(event: MouseEvent): void {
      if (!(event.target instanceof Element)) return
      if (event.target.closest(wanted as string) !== null) raise('target-click')
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [node, onClickStep, wanted])

  useEffect(() => {
    if (target.missing) raise('target-missing')
  }, [target.missing, at])

  // A step says nothing while what it points at is still arriving, but only
  // for a moment: a tour that has gone dark reads as broken, so past the grace
  // the card speaks from the middle of the screen and the light catches up.
  const [patient, setPatient] = useState(false)
  useEffect(() => {
    setPatient(false)
    const timer = setTimeout(() => setPatient(true), TOUR.graceMs)
    return () => clearTimeout(timer)
  }, [at])

  const titleId = useId()
  const bodyId = useId()

  if (step === undefined) return null

  // A step that points at something says nothing until that something is on
  // screen. The recorded run takes a moment to put the teammates up, and a
  // card explaining them over an empty corner is worse than no card at all.
  if (step.target !== null && target.box === null && !target.missing && !patient) return null

  const hole =
    target.box !== null && isOnScreen(target.box, viewport) ? spotlight(target.box, viewport) : null
  const spot =
    hole === null
      ? null
      : placeTooltip({
          target: hole,
          tooltip: card,
          viewport,
          placement: step.placement,
        })
  const shown = at + 1
  const total = steps.length
  const moving = {
    transitionDuration: `${MOTION.quickMs}ms`,
    transitionTimingFunction: MOTION.easing,
  }

  return (
    // Nothing here takes a click by default: only the dark bands and the card
    // do, which leaves the spotlit control answering to the pointer as usual.
    <div className="pointer-events-none fixed inset-0 z-50" data-tour={step.id}>
      {hole === null ? (
        <div className="pointer-events-auto absolute inset-0 bg-black/60" />
      ) : (
        <>
          <Band style={{ top: 0, left: 0, right: 0, height: hole.top }} />
          <Band style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }} />
          <Band style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }} />
          <Band
            style={{
              top: hole.top,
              left: hole.left + hole.width,
              right: 0,
              height: hole.height,
            }}
          />
          <div
            aria-hidden
            className="absolute rounded-lg ring-2 ring-ring/70 transition-all"
            style={{
              ...moving,
              top: hole.top,
              left: hole.left,
              width: hole.width,
              height: hole.height,
            }}
          />
        </>
      )}

      <div
        ref={measureCard}
        role="dialog"
        // Focus is left where it is, since the step often asks for the real
        // control to be pressed; the live region is how a screen reader hears
        // each new step instead.
        aria-live="polite"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className={cn(
          'zt-rise pointer-events-auto absolute flex w-80 flex-col gap-2 rounded-xl border bg-card p-4 shadow-lg transition-all',
          spot === null && 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        )}
        style={spot === null ? moving : { ...moving, top: spot.top, left: spot.left }}
      >
        {spot !== null && <Arrow placement={spot.placement} />}
        <p id={titleId} className="text-sm leading-tight font-medium">
          {step.title}
        </p>
        <p id={bodyId} className="text-xs leading-relaxed text-muted-foreground">
          {step.body}
        </p>
        <div className="flex items-center justify-between gap-3 pt-1">
          {/* The eye reads 3/8 at a glance; a screen reader is told the whole
              sentence, which "3/8" on its own does not say. */}
          <span className="zt-nums text-xs text-muted-foreground">
            <span className="sr-only">{t`Step ${shown} of ${total}`}</span>
            <span aria-hidden>
              {shown}/{total}
            </span>
          </span>
          <div className="flex items-center gap-1">
            <Button variant="quiet" size="xs" onClick={() => send('skip')}>
              {t`Skip tour`}
            </Button>
            {wantsNextButton(step) ? (
              <Button size="xs" onClick={() => send('next-pressed')}>
                {shown === total ? t`Done` : t`Next`}
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">{t`Try the highlighted control`}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// The smallest box covering them all, in viewport coordinates.
function covering(nodes: Element[]): Box | null {
  let top = Number.POSITIVE_INFINITY
  let left = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY
  for (const node of nodes) {
    const rect = node.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) continue
    top = Math.min(top, rect.top)
    left = Math.min(left, rect.left)
    right = Math.max(right, rect.right)
    bottom = Math.max(bottom, rect.bottom)
  }
  if (!Number.isFinite(top) || !Number.isFinite(left)) return null
  return { top, left, width: right - left, height: bottom - top }
}

function Band({ style }: { style: CSSProperties }) {
  return <div aria-hidden className="pointer-events-auto absolute bg-black/60" style={style} />
}

// The card says which way it is pointing. A tip is a square turned on its
// corner and pushed half out of the card, so the two borders that show are the
// card's own and it reads as one shape rather than a badge stuck on the side.
function Arrow({ placement }: { placement: TourPlacement }) {
  const side = OPPOSITE[placement]
  return (
    <span
      aria-hidden
      className={cn(
        'absolute size-3 rotate-45 border-b border-r bg-card',
        side === 'bottom' && 'bottom-0 left-1/2 -ml-1.5 -mb-1.5',
        side === 'top' && 'top-0 left-1/2 -ml-1.5 -mt-1.5 rotate-225',
        side === 'right' && 'top-1/2 right-0 -mt-1.5 -mr-1.5 -rotate-45',
        side === 'left' && 'top-1/2 left-0 -mt-1.5 -ml-1.5 rotate-135',
      )}
    />
  )
}

// Where the tip sits is the side facing the target, which is the far side from
// where the card was placed.
const OPPOSITE: Record<TourPlacement, TourPlacement> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
}

// What the app's own resize listeners see, read through the store hook so the
// value is never a render behind the window it describes.
function useViewport(): Size {
  const reading = useSyncExternalStore(subscribeToWindow, readViewport)
  const [width = 0, height = 0] = reading.split('x').map(Number)
  return { width, height }
}

function subscribeToWindow(onChange: () => void): () => void {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

// A string, because the hook compares snapshots by identity and a fresh object
// every read would never settle.
function readViewport(): string {
  return `${window.innerWidth}x${window.innerHeight}`
}

// `wanted` is the selector this reading was taken for. A step that has just
// moved on still renders once with the previous step's reading in hand, and
// without the selector to check it against, that stale "missing" would skip
// the step that had only just opened.
type Spotted = { wanted: string | null; node: Element | null; box: Box | null; missing: boolean }

// The element a step points at, and where it is right now. The step may run
// before the screen it points at has rendered, so the target is waited for
// rather than skipped on sight, and given up on only after the wait.
function useTarget(selector: string | null, waitMs: number): Spotted {
  const [found, setFound] = useState<Spotted>(EMPTY)

  useEffect(() => {
    setFound({ wanted: selector, node: null, box: null, missing: false })
    if (selector === null) return
    // Held apart from the parameter so the narrowing survives into the
    // callbacks below, which run long after this line.
    const wanted = selector

    let node: Element | null = null
    let waiting: ReturnType<typeof setTimeout> | undefined
    let frame = 0

    // A step may point at a row of things rather than one thing, and the box
    // that holds them is usually wider than they are. Every match is measured
    // and the light is cut to what they cover between them.
    function read(): void {
      if (node === null) return
      const all = [...document.querySelectorAll(wanted)]
      const rect = covering(all.length > 0 ? all : [node])
      if (rect === null) return
      setFound({ wanted, node, box: rect, missing: false })
    }

    const sizes = new ResizeObserver(read)
    // Watching the whole tree is coarse, but the demo's target may be anywhere
    // in an app this observer knows nothing about.
    const arriving = new MutationObserver(() => {
      if (node !== null) return
      const late = document.querySelector(wanted)
      if (late !== null) take(late)
    })

    // A target that has just arrived is usually still moving: the app slides
    // and fades it into place, and a transform changes nothing a size observer
    // would wake for. So it is measured again on every frame until the entrance
    // is over, or the light would keep the shape the thing had while landing.
    let settling = 0
    function settle(): void {
      read()
      if (settling >= SETTLE_FRAMES) return
      settling += 1
      frame = requestAnimationFrame(settle)
    }

    function take(candidate: Element): void {
      node = candidate
      clearTimeout(waiting)
      arriving.disconnect()
      for (const one of document.querySelectorAll(wanted)) sizes.observe(one)
      settling = 0
      settle()
    }

    const first = document.querySelector(wanted)
    if (first !== null) take(first)
    else {
      arriving.observe(document.body, { childList: true, subtree: true })
      waiting = setTimeout(() => setFound({ wanted, node: null, box: null, missing: true }), waitMs)
    }

    // Capture on scroll: the target may sit in a pane that scrolls on its own,
    // and that scroll never reaches the window.
    window.addEventListener('resize', read)
    window.addEventListener('scroll', read, true)
    return () => {
      clearTimeout(waiting)
      cancelAnimationFrame(frame)
      sizes.disconnect()
      arriving.disconnect()
      window.removeEventListener('resize', read)
      window.removeEventListener('scroll', read, true)
    }
  }, [selector, waitMs])

  return found.wanted === selector ? found : EMPTY
}

const EMPTY: Spotted = { wanted: null, node: null, box: null, missing: false }

// The card is placed against its own size, so it has to be measured: it grows
// with the words a step carries, and a guess would leave a long one off screen.
function useMeasured(first: Size): [Size, (node: HTMLElement | null) => void] {
  const [size, setSize] = useState(first)

  const measure = useCallback((node: HTMLElement | null) => {
    if (node === null) return
    const sizes = new ResizeObserver(() => {
      const rect = node.getBoundingClientRect()
      setSize({ width: rect.width, height: rect.height })
    })
    sizes.observe(node)
    return () => sizes.disconnect()
  }, [])

  return [size, measure]
}
