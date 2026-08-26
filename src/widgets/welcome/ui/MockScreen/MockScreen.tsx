import type { CSSProperties } from 'react'
import { AgentSprite } from '@/entities/teammate'
import type { CharacterId } from '@/entities/teammate'
import { ToolIcon } from '@/entities/tool'
import { targetOf, verbOf } from '@/entities/tool'
import type { ToolShape } from '@/entities/tool'
import { MOCK_HEIGHT, MOCK_WIDTH } from '../../lib/fit/fit'
import type { SlideFocus } from '../../lib/slides/slides.types'
import { t } from '@lingui/core/macro'

const YOU = 'Sam'

// Read at call time, never at import: the locale is not up yet when this module loads.
function crew(): {
  name: string
  face: CharacterId
  task: string
  clock: string
  state: 'working' | 'reported'
}[] {
  return [
    {
      name: 'Nova',
      face: 'jelly',
      task: t`Why the last item drops`,
      clock: '1:12',
      state: 'working',
    },
    {
      name: 'Wren',
      face: 'flower',
      task: t`Cart totals and rounding`,
      clock: '0:48',
      state: 'working',
    },
    { name: 'Pace', face: 'bunny', task: t`Stock rules`, clock: '2:04', state: 'reported' },
  ]
}

const CALLS: { shape: ToolShape; note: string }[] = [
  { shape: { kind: 'file', verb: 'read', dir: 'checkout', name: 'basket.ts' }, note: '94 lines' },
  { shape: { kind: 'command', command: 'npm test -- checkout' }, note: '18 passed' },
  { shape: { kind: 'file', verb: 'edit', dir: 'checkout', name: 'total.ts' }, note: '+12 −4' },
]

function modes(): string[] {
  return [t`Ask first`, t`Auto-edit`, t`Allow all`]
}

export function MockScreen({ focus, scale }: { focus: SlideFocus; scale: number }) {
  const box = { width: MOCK_WIDTH * scale, height: MOCK_HEIGHT * scale }
  const stage = {
    ...stageStyle,
    width: MOCK_WIDTH,
    height: MOCK_HEIGHT,
    transform: `scale(${scale})`,
  }

  if (focus === 'hire') {
    return (
      <div style={box}>
        <div data-mock="hire" style={stage}>
          <MockForm />
        </div>
      </div>
    )
  }

  const lit = (part: SlideFocus): boolean =>
    focus === 'all' || focus === part || (part === 'calls' && focus === 'crew')

  const dim = (part: SlideFocus): CSSProperties => ({
    opacity: lit(part) ? 1 : 0.22,
    transition: 'opacity 260ms ease',
  })

  return (
    <div style={box}>
      <div data-mock={focus} style={stage}>
        <div className="flex min-h-0 flex-1 gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-4" style={dim('talk')}>
            <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-2xl border border-border bg-card p-5">
              <span className="ml-auto max-w-[78%] rounded-2xl bg-muted px-3.5 py-2 text-sm leading-snug">
                {t`Find why checkout drops the last item`}
              </span>
              <span className="text-sm leading-relaxed text-muted-foreground">
                {t`Three teammates are on it: the checkout flow, the cart totals and the stock rules. I'll put their reports together into one answer.`}
              </span>
            </div>

            <div
              className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3"
              style={dim(focus === 'keys' ? 'keys' : 'talk')}
            >
              <span className="flex-1 text-sm text-muted-foreground">{t`Keep going`}</span>
              {modes().map((mode, index) => (
                <span
                  key={mode}
                  className="rounded-full px-2.5 py-1 text-xs"
                  style={index === 0 ? chosenStyle : quietStyle}
                >
                  {mode}
                </span>
              ))}
            </div>
          </div>

          <div
            className="flex w-[46%] flex-col gap-3 rounded-2xl border border-border bg-card p-4"
            style={dim('crew')}
          >
            <span className="flex items-center justify-center gap-2 text-sm">
              <AgentSprite subagentType={YOU} chosen="star" state="working" size={20} />
              {YOU}
              <span className="text-xs text-muted-foreground">{t`· 2 working`}</span>
            </span>

            <div className="grid grid-cols-3 gap-2">
              {crew().map((one) => (
                <span
                  key={one.name}
                  className="flex flex-col gap-1.5 rounded-xl border border-border px-2.5 py-2"
                >
                  <span className="flex items-center gap-1.5 text-xs">
                    <AgentSprite
                      subagentType={one.name}
                      chosen={one.face}
                      state={one.state}
                      size={18}
                    />
                    {one.name}
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {one.clock}
                    </span>
                  </span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{one.task}</span>
                </span>
              ))}
            </div>

            <div className="mt-1 flex flex-col gap-1.5" style={dim('calls')}>
              <span className="text-xs tracking-[0.08em] text-muted-foreground">{t`What they did`}</span>
              {CALLS.map((call) => (
                <span key={call.note} className="flex items-center gap-2 text-xs">
                  <ToolIcon shape={call.shape} size={16} />
                  <span className="flex-none">{verbOf(call.shape)}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">
                    {targetOf(call.shape)}
                  </span>
                  <span className="flex-none font-mono text-muted-foreground">{call.note}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div
          className="flex flex-none items-center gap-3 border-t border-border pt-3 font-mono text-xs text-muted-foreground"
          style={dim('keys')}
        >
          <span className="relative h-1 w-14 overflow-hidden rounded-full bg-muted">
            <span style={fillStyle} />
          </span>
          {t`38% · 4h 12m left`}
          <span className="ml-auto">MCP 3/3</span>
        </div>
      </div>
    </div>
  )
}

function MockForm() {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex w-[300px] flex-none flex-col gap-5 border-r border-border p-5">
        <span className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">{t`Name`}</span>
          <span className="rounded-xl border border-border px-3 py-2 text-sm">{t`Reviewer`}</span>
        </span>

        <span className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">{t`When to call them`}</span>
          <span className="rounded-xl border border-border px-3 py-2 text-sm">
            {t`Reviews a change before it ships`}
          </span>
          <span className="text-xs text-muted-foreground">
            {t`The orchestrator reads this to pick who gets the job.`}
          </span>
        </span>

        <span className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">{t`Face`}</span>
          <span className="flex gap-2">
            {FACES.map((face) => (
              <AgentSprite key={face} subagentType={face} chosen={face} state="idle" size={26} />
            ))}
          </span>
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-5">
        <span className="text-xs text-muted-foreground">{t`Their instructions`}</span>
        <span className="flex min-h-0 flex-1 flex-col gap-3 rounded-xl border border-border p-4 font-mono text-sm leading-relaxed text-muted-foreground">
          <span>{t`Read the change before you judge it, and check what it touches.`}</span>
          <span>{t`Say what you would change and why, in that order.`}</span>
        </span>
        <span className="text-xs text-muted-foreground">
          {t`This always applies. Write it the way you would explain the job to a person.`}
        </span>
        <span className="mt-1 flex justify-end">
          <span className="rounded-full px-4 py-2 text-sm" style={hireStyle}>
            {t`Hire`}
          </span>
        </span>
      </div>
    </div>
  )
}

const FACES: CharacterId[] = ['star', 'jelly', 'flower', 'ghost', 'bunny']

const hireStyle: CSSProperties = {
  background: 'var(--color-primary)',
  color: 'var(--color-primary-foreground)',
}

const stageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  padding: 20,
  borderRadius: 22,
  border: '1px solid var(--color-border)',
  background: 'var(--color-background)',
  boxShadow: '0 30px 70px -34px rgb(0 0 0 / 0.9)',
  transformOrigin: 'top left',
}

const chosenStyle: CSSProperties = {
  background: 'var(--color-muted)',
  color: 'var(--color-foreground)',
}

const quietStyle: CSSProperties = { color: 'var(--color-muted-foreground)' }

const fillStyle: CSSProperties = {
  position: 'absolute',
  insetBlock: 0,
  left: 0,
  width: '38%',
  borderRadius: 999,
  background: 'currentColor',
}
