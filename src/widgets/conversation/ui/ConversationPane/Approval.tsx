import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode, RefCallback } from 'react'
import type { PermissionAsk } from '@/entities/agent-session'
import { toolShape } from '@/entities/tool'
import { modifierKey } from '@/shared/lib/platform/platform'
import { layerOver } from '@/shared/lib/modal/modal'
import { cn } from '@/shared/lib/cn'
import { useClipped } from '@/shared/lib/measure/clipped/useClipped'
import { useScrollState } from '@/shared/lib/measure/scroll-state/useScrollState'
import { armed } from '@/widgets/conversation/lib/arming/arming'
import { Button } from '@/shared/ui/button'
import { Kbd, KbdGroup } from '@/shared/ui/kbd'
import { ChangeDiff, ToolIcon } from '@/entities/tool'
import { Markdown } from '@/shared/markdown/Markdown/Markdown'
import { plural, t } from '@lingui/core/macro'

const PLAN_TOOL = 'ExitPlanMode'

// How much of an edit the card shows before the person asks for the rest. Long
// enough to recognise the change, short enough that the buttons stay in view.
const DIFF_LINES = 8

export function Approval({
  ask,
  onDecide,
}: {
  ask: PermissionAsk
  onDecide(allow: boolean, always?: boolean): void
}) {
  const shownAtRef = useRef(Date.now())
  // Which question the person opened up. Holding the request id rather than a
  // flag is what makes the next question arrive folded again, without an
  // effect that would render the new body opened for a frame first.
  const [openedFor, setOpenedFor] = useState<string | null>(null)
  const open = openedFor === ask.requestId

  useEffect(() => {
    shownAtRef.current = Date.now()
  }, [ask.requestId])

  function decide(allow: boolean, always?: boolean): void {
    if (!armed(shownAtRef.current, Date.now())) return
    onDecide(allow, always)
  }

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent): void {
      if (event.repeat) return
      if (layerOver(document)) return
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        decide(true)
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        decide(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ask.requestId, onDecide])

  const shape = toolShape(ask.toolName, null)
  const plan = ask.toolName === PLAN_TOOL ? (ask.plan ?? '') : ''
  const change = ask.change ?? []
  const count = ask.count ?? null

  return (
    // The card carries the one decision the app cannot undo, so it is allowed
    // most of the window rather than a fixed few lines. Only the body scrolls:
    // the question and the buttons stay where the person left them.
    <div
      data-approval
      className="flex max-h-[60vh] flex-none flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex flex-none items-baseline gap-2">
        <span className="text-base">{verbOf(ask.toolName)}</span>
        <span className="font-mono text-xs text-muted-foreground">{ask.toolName}</span>
        {count !== null && (
          <span data-change className="ml-auto flex-none font-mono text-xs tabular-nums">
            {count.added > 0 && <span className="text-added">+{count.added}</span>}
            {count.removed > 0 && (
              <span className="ml-1 text-removed">
                {'−'}
                {count.removed}
              </span>
            )}
          </span>
        )}
      </div>

      {plan ? (
        // A plan is prose the person is agreeing to, so it stays markdown; the
        // fold only decides how much of it is on screen at once.
        <Fold open={open} grow={open} onOpen={() => setOpenedFor(ask.requestId)} cap="max-h-80">
          <div data-plan data-selectable className="text-sm">
            <Markdown text={plan} />
          </div>
        </Fold>
      ) : (
        <Fold
          open={open}
          // With a diff under it this line is only the file it names, and the
          // room the card has left belongs to the change itself.
          grow={open && change.length === 0}
          onOpen={() => setOpenedFor(ask.requestId)}
          cap="max-h-52"
        >
          <div
            data-selectable
            className="flex items-start gap-2 font-mono text-sm [overflow-wrap:anywhere]"
          >
            <span className="mt-[3px] flex-none text-muted-foreground">
              <ToolIcon shape={shape} />
            </span>
            <span className="whitespace-pre-wrap">{ask.detail || ask.line}</span>
          </div>
        </Fold>
      )}

      {change.length > 0 && (
        <div
          data-approval-change
          className={cn(
            'zt-scroll flex flex-col gap-1.5 overflow-y-auto',
            open && 'min-h-0 flex-auto',
          )}
        >
          <ChangeDiff groups={change} {...(open ? {} : { maxLines: DIFF_LINES })} />
          <div className="flex">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-show-change
              onClick={() => setOpenedFor(open ? null : ask.requestId)}
              className="h-7 rounded-lg px-2 text-xs text-muted-foreground"
            >
              {open ? t`Show less` : t`Show the whole change`}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-none flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => decide(true)} className="rounded-full">
          {t`Allow`}
          <KbdGroup>
            <Kbd className="bg-primary-foreground/15 text-primary-foreground/70">
              {modifierKey()}
            </Kbd>
            <Kbd className="bg-primary-foreground/15 text-primary-foreground/70">Enter</Kbd>
          </KbdGroup>
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => decide(false)}
          className="rounded-full"
        >
          {t`Deny`}
          <Kbd>Esc</Kbd>
        </Button>
        {/* Standing approval is withheld for plans: pressed once, every later
            plan would be approved unread, which is the whole of what plan mode
            is asked to prevent. */}
        {ask.toolName !== PLAN_TOOL && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => decide(true, true)}
            className="rounded-full text-muted-foreground"
          >
            {t`Don't ask again this session`}
          </Button>
        )}
      </div>
    </div>
  )
}

// A body that may be longer than the room it is given. Folded it stops at its
// cap, fades where it was cut and says how many lines are under the cut;
// opened it takes what the card has left. The box scrolls either way, so
// nothing the fold hides is out of the keyboard's reach.
function Fold({
  open,
  grow,
  onOpen,
  cap,
  children,
}: {
  open: boolean
  grow: boolean
  onOpen(): void
  cap: string
  children: ReactNode
}) {
  // Named for the message it feeds: the app already says "# more lines"
  // about capped output, and one wording for one idea keeps the catalog honest.
  const [attachClip, rest] = useClipped<HTMLElement>()
  const [attachScroll] = useScrollState<HTMLElement>()

  // Both hooks want the same node: one counts what was cut off, the other
  // marks the box as scrolled to its end so the fade lifts there. Returning a
  // teardown stops React calling this back with null, so the scroll watcher is
  // detached by hand.
  const attach = useCallback<RefCallback<HTMLElement>>(
    (el) => {
      const dropClip = attachClip(el)
      attachScroll(el)
      return () => {
        dropClip?.()
        attachScroll(null)
      }
    },
    [attachClip, attachScroll],
  )

  const folded = rest > 0 && !open

  return (
    <div className={cn('relative flex min-h-0 flex-col', grow && 'flex-auto')}>
      <section
        ref={attach}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable box is only reachable by keyboard if it takes a tab stop, and a folded body is exactly the case with something below the fold to reach
        tabIndex={0}
        aria-label={t`What is being approved`}
        className={cn(
          'zt-scroll overflow-y-auto pr-2.5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          open ? 'min-h-0 flex-auto' : cap,
          folded && 'zt-fade-out',
        )}
      >
        {children}
      </section>
      {folded && (
        <Button
          type="button"
          variant="outline"
          size="xs"
          data-more-lines
          onClick={onOpen}
          className="absolute right-3 bottom-1 rounded-full text-muted-foreground"
        >
          {plural(rest, { one: '# more line', other: '# more lines' })}
        </Button>
      )}
    </div>
  )
}

function verbOf(toolName: string): string {
  switch (toolName) {
    case 'Bash':
      return t`Run this command?`
    case 'Write':
      return t`Write this file?`
    case 'Edit':
    case 'MultiEdit':
      return t`Edit this file?`
    case 'WebFetch':
    case 'WebSearch':
      return t`Reach out to the web?`
    case PLAN_TOOL:
      return t`Approve this plan?`
    default:
      return t`Allow this?`
  }
}
