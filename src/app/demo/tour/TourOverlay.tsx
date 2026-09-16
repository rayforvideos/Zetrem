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
  // Held apart from the target: the step waits on this before it speaks, and
  // lights the target once it does.
  const settled = useTarget(step?.waitFor ?? null, waitMs)
  // The same wait from the other side: something that has to be gone, not
  // there. Read every frame, since nothing announces an element leaving.
  const gone = useGone(step?.waitGone ?? null)

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
  const wanted = step?.advanceOn ?? step?.target ?? null

  useEffect(() => {
    if (node === null || !onClickStep || wanted === null) return
    // Capture, so the step is answered even when the control stops the click
    // on its way up.
    //
    // Matched by the selector rather than against the one element that was
    // measured: a step may point at a row of things, and pressing the second
    // of them is as much an answer as pressing the first.
    let timer: ReturnType<typeof setTimeout> | null = null
    function onClick(event: MouseEvent): void {
      if (!(event.target instanceof Element)) return
      if (event.target.closest(wanted as string) === null) return
      // Answered on the next tick, not here. The step that follows often
      // closes the pane the control lives in, and moving on while the click
      // is still on its way down unmounts the button before its own handler
      // ever runs: the visitor presses "file it" and nothing is filed.
      timer = setTimeout(() => raise('target-click'), 0)
    }
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      if (timer !== null) clearTimeout(timer)
    }
  }, [node, onClickStep, wanted])

  useEffect(() => {
    if (target.missing) raise('target-missing')
  }, [target.missing, at])

  // A step speaks once its target has stopped moving, and then keeps speaking.
  // The box moves again later on its own — a row grows as a tool reports, a
  // counter ticks a tile wider — and a card that went away for every one of
  // those would blink through the whole stop instead of following it.
  const [spoke, setSpoke] = useState(-1)
  useEffect(() => {
    if (target.steady && spoke !== at) setSpoke(at)
  }, [target.steady, at, spoke])

  // Everything a step waits on before it is allowed to speak:
  //
  // - what the step is about is not on screen yet. The recorded run takes a
  //   moment to put the teammates up, and a card explaining them over an empty
  //   corner is worse than no card at all.
  // - something that has to go is still going. The layout under a leaving
  //   panel is still about to move, and a card placed against it now jumps.
  // - the box it points at has not stopped moving. A card that appears in the
  //   middle and then slides into place is two appearances, and only the
  //   second one was wanted.
  const waitingOn =
    step !== undefined &&
    ((step.waitFor !== undefined && settled.node === null && !settled.missing) ||
      !gone ||
      (step.target !== null && !target.steady && spoke !== at && !target.missing))

  // Most of those waits are over in a frame or two and saying anything about
  // them would be a flash. The one that is not is the run itself, and that one
  // is long enough that a visitor with nothing on screen decides the tour is
  // over and walks away.
  const [saidSo, setSaidSo] = useState(false)
  useEffect(() => {
    if (!waitingOn) {
      setSaidSo(false)
      return undefined
    }
    const timer = setTimeout(() => setSaidSo(true), HELD_SHOWN_MS)
    return () => clearTimeout(timer)
  }, [waitingOn])

  const titleId = useId()
  const bodyId = useId()

  if (step === undefined) return null

  const shown = at + 1
  const total = steps.length

  // Said rather than nothing: the walk goes on, and this is how much of it is
  // still to come.
  if (waitingOn) return saidSo ? <Held left={total - at} /> : null

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
  const moving = {
    transitionDuration: `${MOTION.quickMs}ms`,
    transitionTimingFunction: MOTION.easing,
  }

  return (
    // Nothing here takes a click by default: only the dark bands and the card
    // do, which leaves the spotlit control answering to the pointer as usual.
    // Above every portal the app puts up. Dialogs and sheets mount at the end
    // of <body> at z-50, after this root, so a tour at the same level loses the
    // tie and its card stops taking clicks the moment a form opens.
    <div className="pointer-events-none fixed inset-0 z-[70]" data-tour={step.id}>
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

// How long a step waits before it admits to waiting.
const HELD_SHOWN_MS = 600

// What stands in for the card while a step waits on the app. It lights nothing
// and covers nothing, so the visitor watches the run rather than the tour, and
// it says how much is left so a long wait does not read as the end.
function Held({ left }: { left: number }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" data-tour-held>
      <div className="zt-rise absolute bottom-10 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-card/90 px-4 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur">
        <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-foreground/60" />
        <span>{t`Just a moment · ${left} chapters left`}</span>
      </div>
    </div>
  )
}

// Whether nothing on screen answers to a selector.
function useGone(selector: string | null): boolean {
  const [gone, setGone] = useState(true)
  useEffect(() => {
    if (selector === null) {
      setGone(true)
      return undefined
    }
    let frame = 0
    const look = (): void => {
      setGone(document.querySelector(selector) === null)
      frame = requestAnimationFrame(look)
    }
    look()
    return () => cancelAnimationFrame(frame)
  }, [selector])
  return gone
}

// Frames a box must hold still before the step is allowed to speak.
const STILL_FRAMES = 3

// How long that stillness is waited for. Every entrance the app plays is over
// well inside this; what runs past it is something that is not going to stop.
const RESTLESS_MS = 600

// Two readings are the same when nothing moved worth redrawing for.
function same(was: Box | null, now: Box): boolean {
  if (was === null) return false
  return (
    Math.abs(was.top - now.top) < 0.5 &&
    Math.abs(was.left - now.left) < 0.5 &&
    Math.abs(was.width - now.width) < 0.5 &&
    Math.abs(was.height - now.height) < 0.5
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
type Spotted = {
  wanted: string | null
  node: Element | null
  box: Box | null
  missing: boolean
  // True once the box has been the same for a few frames running: the target
  // has arrived and its entrance is over.
  steady: boolean
}

// The element a step points at, and where it is right now. The step may run
// before the screen it points at has rendered, so the target is waited for
// rather than skipped on sight, and given up on only after the wait.
function useTarget(selector: string | null, waitMs: number): Spotted {
  const [found, setFound] = useState<Spotted>(EMPTY)

  useEffect(() => {
    setFound({ wanted: selector, node: null, box: null, missing: false, steady: false })
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
    let last: Box | null = null
    let still = 0
    // Some boxes never stop: a field grows under the typing, a counter widens
    // a tile every second. Waiting for those to hold still keeps the step
    // silent for good, so past this the box is taken as it reads and the card
    // follows it. It is still never placed against nothing, which is the fault
    // the stillness rule was added to fix.
    let restless = false
    let patience: ReturnType<typeof setTimeout> | undefined

    function read(): void {
      if (node === null) return
      const all = [...document.querySelectorAll(wanted)]
      const rect = covering(all.length > 0 ? all : [node])
      if (rect === null) return
      if (same(last, rect)) {
        if (still >= STILL_FRAMES) return
        still += 1
        if (still < STILL_FRAMES) return
        setFound({ wanted, node, box: rect, missing: false, steady: true })
        return
      }
      still = 0
      last = rect
      setFound({ wanted, node, box: rect, missing: false, steady: restless })
    }

    const sizes = new ResizeObserver(read)
    // Watching the whole tree is coarse, but the demo's target may be anywhere
    // in an app this observer knows nothing about.
    const arriving = new MutationObserver(() => {
      if (node !== null) return
      const late = document.querySelector(wanted)
      if (late !== null) take(late)
    })

    // Measured every frame for as long as the step lasts. A target moves for
    // reasons no observer reports: it slides in under a transform, or a panel
    // above it opens and pushes it down without changing its own size. The
    // reading is only handed on when it has actually changed, so the cost is a
    // rectangle a frame and nothing re-renders for standing still.
    function settle(): void {
      read()
      frame = requestAnimationFrame(settle)
    }

    function take(candidate: Element): void {
      node = candidate
      clearTimeout(waiting)
      arriving.disconnect()
      for (const one of document.querySelectorAll(wanted)) sizes.observe(one)
      patience = setTimeout(() => {
        restless = true
        read()
      }, RESTLESS_MS)
      settle()
    }

    const first = document.querySelector(wanted)
    if (first !== null) take(first)
    else {
      // Attributes too: a step may wait on a state rather than an arrival, and
      // a panel that is already in the tree and merely stops being hidden
      // changes no child of anything.
      arriving.observe(document.body, { childList: true, subtree: true, attributes: true })
      waiting = setTimeout(
        () => setFound({ wanted, node: null, box: null, missing: true, steady: false }),
        waitMs,
      )
    }

    // Capture on scroll: the target may sit in a pane that scrolls on its own,
    // and that scroll never reaches the window.
    window.addEventListener('resize', read)
    window.addEventListener('scroll', read, true)
    return () => {
      clearTimeout(waiting)
      clearTimeout(patience)
      cancelAnimationFrame(frame)
      sizes.disconnect()
      arriving.disconnect()
      window.removeEventListener('resize', read)
      window.removeEventListener('scroll', read, true)
    }
  }, [selector, waitMs])

  return found.wanted === selector ? found : EMPTY
}

const EMPTY: Spotted = { wanted: null, node: null, box: null, missing: false, steady: false }

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
