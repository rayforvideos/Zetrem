import { useCallback, useEffect, useRef } from 'react'
import { BookmarkPlus, FileText, Image } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { ReactNode, RefCallback } from 'react'
import type { PermissionAsk, SessionStatus, StatusState } from '@/entities/agent-session'
import type { LibraryProposal } from '@/entities/library'
import type { Chore } from '@/entities/conversation'
import type { FaceId } from '@/entities/user'
import { AgentSprite, personaOf } from '@/entities/teammate'
import type { Turn } from '@/entities/conversation'
import { cn } from '@/shared/lib/cn'
import { atEnd } from '@/shared/lib/measure/scroll-state/scroll-state'
import { useScrollState } from '@/shared/lib/measure/scroll-state/useScrollState'
import { shouldFollow, swapped } from '../../lib/follow/follow'
import { askedAtMs } from '../../lib/working/working'
import { Wordmark } from '@/shared/graphics/Wordmark/Wordmark'
import { Markdown } from '@/shared/markdown/Markdown/Markdown'
import { Approval } from './Approval'
import { ProposalCard } from '../ProposalCard/ProposalCard'
import { FirstHint } from '@/shared/parts/FirstHint/FirstHint'
import { Greeting } from './Greeting'
import { Thinking } from './Thinking'
import { ToolRun } from '../ToolRun/ToolRun'
import { Working } from './Working'
import { Away } from './Away'
import { Chores } from './Chores'
import type { Away as Waiting } from '../../lib/away/away.types'
import { t } from '@lingui/core/macro'

const BUBBLE = 'rounded-2xl rounded-br-md bg-muted px-4 py-2.5'

type ConversationPaneProps = {
  turns: Turn[]
  status: SessionStatus
  statusState: StatusState
  permission: PermissionAsk | null
  // What agents have suggested for the library, oldest first.
  proposals: LibraryProposal[]
  chatTitleOf(session: string): string | null
  you: { name: string; face: FaceId }
  away: Waiting | null
  chores: Chore[]
  nowMs: number
  // Where the work is happening, so a tool row can show a path the way the
  // project speaks it rather than from the root of the disk.
  project: string | null
  onDecide(allow: boolean, always?: boolean): void
  onAcceptProposal(id: string): void
  onDismissProposal(id: string): void
  onFileTurn(text: string): void
  report: ReactNode
  composer: ReactNode
  hint: boolean
  onHintSeen(): void
}

const UP_SLACK_PX = 2

export function ConversationPane({
  turns,
  status,
  statusState,
  permission,
  proposals,
  chatTitleOf,
  you,
  away,
  chores,
  nowMs,
  project,
  onDecide,
  onAcceptProposal,
  onDismissProposal,
  onFileTurn,
  report,
  composer,
  hint,
  onHintSeen,
}: ConversationPaneProps) {
  const [attachScroll, scrollRef] = useScrollState<HTMLDivElement>()
  const seen = useRef(0)
  const first = useRef<string | null>(null)
  const following = useRef(true)
  const lastTop = useRef(0)
  const busy = status === 'working'
  const lastIndex = turns.length - 1
  // One card at a time: the one that has waited longest.
  const oldest = proposals[0]
  const card = oldest !== undefined && (
    <ProposalCard
      proposal={oldest}
      waiting={proposals.length}
      chatTitleOf={chatTitleOf}
      onAccept={onAcceptProposal}
      onDismiss={onDismissProposal}
    />
  )

  function watch(): void {
    const el = scrollRef.current
    if (el === null) return
    const wentUp = el.scrollTop < lastTop.current - UP_SLACK_PX
    lastTop.current = el.scrollTop
    if (wentUp) following.current = false
    else if (atEnd(el.scrollTop, el.scrollHeight, el.clientHeight)) following.current = true
  }

  // A pin the code makes is not the reader scrolling: the scroll event it
  // fires must not read as "went up" when the new bottom is above the old
  // scrollTop, or following would switch itself off the moment a shorter
  // chat lands.
  function pin(el: HTMLDivElement): void {
    el.scrollTop = el.scrollHeight
    lastTop.current = el.scrollTop
  }

  // The approval card takes its height out of the transcript's, and a box that
  // shrinks keeps the scrollTop it had: the message that asked for the card
  // slides under the fold and cannot be scrolled back to. Re-pinning on the
  // transcript's own resize is what keeps the last thing said in view, however
  // tall the card under it grows.
  //
  // The box is not enough, though. A chat that comes back arrives whole, and
  // its Markdown, code, diffs and images lay out for a while after the pin
  // that met it; that only grows scrollHeight, and a box whose own size did
  // not change never hears of it. So the turns are watched too, and any turn
  // that joins later along with them, and the pin follows every growth for as
  // long as the reader has not scrolled away.
  const attachTranscript = useCallback<RefCallback<HTMLDivElement>>(
    (el) => {
      attachScroll(el)
      if (el === null) return undefined
      const watching = new ResizeObserver(() => {
        if (following.current) pin(el)
      })
      watching.observe(el)
      for (const child of el.children) watching.observe(child)
      const joined = new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.removedNodes) {
            if (node instanceof Element) watching.unobserve(node)
          }
          for (const node of record.addedNodes) {
            if (node instanceof Element) watching.observe(node)
          }
        }
      })
      joined.observe(el, { childList: true })
      return () => {
        joined.disconnect()
        watching.disconnect()
        attachScroll(null)
      }
    },
    [attachScroll],
  )

  useEffect(() => {
    const el = scrollRef.current
    const before = seen.current
    const nowFirst = turns[0]?.id ?? null
    const other = swapped(first.current, nowFirst)
    seen.current = turns.length
    first.current = nowFirst
    if (el === null) return undefined
    if (!shouldFollow(before, turns.length, following.current, other)) return undefined
    // Landing at the end is following again, whatever the reader had done in
    // the chat before; it is the flag that lets the observer keep the pin.
    following.current = true
    pin(el)
    const frame = requestAnimationFrame(() => {
      if (following.current) pin(el)
    })
    return () => cancelAnimationFrame(frame)
  }, [turns, permission, chores, scrollRef])

  if (turns.length === 0 && !permission) {
    return (
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center">
        <Wordmark width={196} />
        <Greeting name={you.name} />
        {hint && (
          <div className="mt-7 w-full max-w-md">
            <FirstHint
              title={t`Ask for the whole job`}
              body={t`Say what you want done, not the next step. The orchestrator splits it up and hands out the pieces.`}
              onClose={onHintSeen}
            />
          </div>
        )}
        <div className="mt-9 flex w-full max-w-3xl flex-col gap-4">
          {card}
          {composer}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col gap-4 px-2">
      {report !== null ? (
        report
      ) : (
        <>
          <div
            ref={attachTranscript}
            onScroll={watch}
            data-selectable
            className="zt-scroll zt-fade-out -mr-2 flex min-h-0 flex-1 flex-col gap-6 overflow-x-hidden overflow-y-auto pr-5 pb-3"
          >
            {turns.map((turn, index) => {
              const live = busy && index === lastIndex && turn.role === 'assistant'
              if (turn.role === 'system') {
                return (
                  <div
                    key={turn.id}
                    className="zt-rise self-center font-mono text-xs leading-normal tracking-wide text-muted-foreground [overflow-wrap:anywhere]"
                  >
                    {turn.text}
                  </div>
                )
              }
              if (turn.role === 'user') {
                return (
                  <div
                    key={turn.id}
                    className="zt-rise flex max-w-[80%] flex-col items-end gap-1 self-end"
                  >
                    {turn.to !== undefined && (
                      <span
                        data-said-to
                        className="flex items-center gap-1.5 pr-1 text-xs text-muted-foreground"
                      >
                        <span aria-hidden>→</span>
                        <AgentSprite subagentType={turn.to} size={14} />
                        {personaOf(turn.to).name}
                      </span>
                    )}
                    {(turn.files ?? []).length > 0 && (
                      <span data-sent-files className="flex flex-wrap justify-end gap-1.5">
                        {(turn.files ?? []).map((file) => (
                          <span
                            key={file.path}
                            data-file={file.kind}
                            className="flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground"
                          >
                            {file.kind === 'image' ? (
                              <Image className="size-3.5" />
                            ) : (
                              <FileText className="size-3.5" />
                            )}
                            <span className="max-w-[180px] truncate">{file.name}</span>
                          </span>
                        ))}
                      </span>
                    )}
                    {turn.text.length > 0 && (
                      <div
                        className={cn(
                          BUBBLE,
                          'text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]',
                        )}
                      >
                        {turn.text}
                      </div>
                    )}
                  </div>
                )
              }
              return (
                <article
                  key={turn.id}
                  className={cn('zt-rail zt-rise flex flex-col gap-2.5', live && 'zt-rail--live')}
                >
                  {turn.thinking.length > 0 && <Thinking text={turn.thinking} />}
                  {turn.text.length > 0 && (
                    <Markdown text={turn.text} className="text-base leading-[1.72]" />
                  )}
                  {turn.draft.length > 0 && (
                    <div className="text-base leading-[1.72] whitespace-pre-wrap [overflow-wrap:anywhere]">
                      {turn.draft}
                      <span className="ml-0.5 inline-block h-[1em] w-[0.5ch] translate-y-[0.1em] bg-muted-foreground align-baseline" />
                    </div>
                  )}
                  {turn.tools.length > 0 && (
                    <ToolRun tools={turn.tools} live={live} nowMs={nowMs} project={project} />
                  )}
                  {turn.text.length > 0 && !live && (
                    // On show, not on hover: an answer worth keeping is worth
                    // keeping the moment it lands, and a button that appears
                    // only under the pointer is one nobody knows about.
                    <div className="flex">
                      <Button
                        data-file-turn
                        variant="ghost"
                        size="sm"
                        onClick={() => onFileTurn(turn.text)}
                        className="h-7 rounded-lg px-2 text-xs text-muted-foreground"
                        title={t`File this answer to the library as its own note`}
                      >
                        <BookmarkPlus className="size-3" />
                        {t`To the library`}
                      </Button>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
          <Chores chores={chores} nowMs={nowMs} />
          {!busy && away !== null && <Away away={away} face={you.face} nowMs={nowMs} />}
          {busy && (
            <Working
              turns={turns}
              face={you.face}
              nowMs={nowMs}
              startedAtMs={askedAtMs(turns, nowMs)}
              tokensOut={statusState.cost.tokens.out}
            />
          )}
        </>
      )}

      {permission ? (
        <Approval ask={permission} onDecide={onDecide} />
      ) : (
        <>
          {card}
          {composer}
        </>
      )}
    </div>
  )
}
