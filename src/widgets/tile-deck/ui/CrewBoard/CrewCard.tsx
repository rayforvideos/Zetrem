import type { CSSProperties } from 'react'
import { AgentSprite, useModel } from '@/entities/agent-session'
import type { AgentSession } from '@/entities/agent-session'
import { ToolIcon } from '@/shared/graphics/ToolIcon/ToolIcon'
import { reachOf } from '@/shared/lib/reach/reach'
import { formatClock } from '@/shared/lib/units/units'
import { Button } from '@/shared/ui/button'
import { modelLabel } from '@/shared/lib/model-label/model-label'
import { laneOf } from '../../lib/lane/lane'

export function CrewCard({
  session,
  nowMs,
  open,
  attention,
  onOpen,
}: {
  session: AgentSession
  nowMs: number
  open: boolean
  attention: boolean
  onOpen(): void
}) {
  const lane = laneOf(session, nowMs)
  const model = modelLabel(useModel(lane.subagentType))

  return (
    <Button
      variant="ghost"
      size="bare"
      data-card={session.id}
      data-open={open || undefined}
      onClick={onOpen}
      aria-pressed={open}
      style={{ ...cardStyle, ...(open ? openStyle : null) }}
    >
      <span
        aria-hidden
        style={{ ...reachStyle, width: `${lane.live ? reachOf(lane.outMs) : 0}%` }}
      />
      {session.status === 'waiting' && (
        <span data-waiting data-eye={attention || undefined} style={waitingMarkStyle(attention)} />
      )}

      <span style={headStyle}>
        <AgentSprite subagentType={lane.subagentType} state={session.status} size={24} />
        <span style={nameStyle}>{lane.name}</span>
        {model !== null && <span data-model style={modelStyle}>{model}</span>}
        <span style={clockStyle}>{formatClock(lane.outMs / 1000)}</span>
      </span>

      <span style={taskStyle}>{session.label}</span>

      <span data-doing style={doingStyle}>
        {lane.shape !== null && (
          <span style={iconStyle}>
            <ToolIcon shape={lane.shape} size={13} />
          </span>
        )}
        <span style={verbStyle}>{lane.verb}</span>
        {lane.target.length > 0 && <span style={targetStyle}>{lane.target}</span>}
      </span>
    </Button>
  )
}

const modelStyle: CSSProperties = {
  flex: 'none',
  fontFamily: 'var(--zt-mono)',
  fontSize: 10,
  letterSpacing: '0.02em',
  opacity: 0.5,
}

const cardStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: 6,
  width: '100%',
  minWidth: 0,
  height: 'auto',
  padding: '10px 12px 12px',
  borderRadius: 12,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'var(--color-border)',
  background: 'var(--color-card)',
  overflow: 'hidden',
  textAlign: 'left',
  fontSize: 12,
  transition: 'background 160ms ease, border-color 160ms ease',
}

const openStyle: CSSProperties = {
  background: 'var(--color-muted)',
  borderColor: 'var(--color-muted-foreground)',
}

function waitingMarkStyle(attention: boolean): CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    borderRadius: 12,
    border: '1px solid currentColor',
    opacity: attention ? 0.85 : 0.25,
    pointerEvents: 'none',
  }
}

const reachStyle: CSSProperties = {
  position: 'absolute',
  insetBlock: 0,
  left: 0,
  background: 'linear-gradient(to right, currentColor, transparent)',
  opacity: 0.06,
  pointerEvents: 'none',
}

const headStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  minWidth: 0,
}

const nameStyle: CSSProperties = {
  fontSize: 13,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const clockStyle: CSSProperties = {
  marginLeft: 'auto',
  flex: '0 0 auto',
  fontFamily: 'var(--zt-mono)',
  fontVariantNumeric: 'tabular-nums',
  fontSize: 11,
  opacity: 0.6,
}

const taskStyle: CSSProperties = {
  position: 'relative',
  fontSize: 11.5,
  lineHeight: 1.35,
  opacity: 0.72,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}

const doingStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  minWidth: 0,
  marginTop: 2,
}

const iconStyle: CSSProperties = { flex: '0 0 auto', display: 'flex', opacity: 0.85 }

const verbStyle: CSSProperties = {
  flex: '0 0 auto',
  maxWidth: '60%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const targetStyle: CSSProperties = {
  flex: '1 1 auto',
  minWidth: 0,
  fontFamily: 'var(--zt-mono)',
  fontSize: 11,
  opacity: 0.7,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}
