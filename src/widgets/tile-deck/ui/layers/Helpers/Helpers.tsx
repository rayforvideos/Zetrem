import type { CSSProperties } from 'react'
import type { AgentSession } from '@/entities/agent-session'
import { AgentSprite } from '@/entities/teammate'
import { t } from '@lingui/core/macro'

// A teammate's own subagents never take a tile of their own, so a tile holds
// only a few of them before it starts crowding the work it is really showing.
const SHOWN = 4

export function Helpers({ helpers }: { helpers: AgentSession[] }) {
  if (helpers.length === 0) return null

  const ordered = [...helpers].sort((a, b) => a.startedAtMs - b.startedAtMs)
  const shown = ordered.slice(0, SHOWN)
  const rest = ordered.length - shown.length

  return (
    <div data-helpers style={rootStyle}>
      <span style={headStyle}>{t`Their helpers`}</span>
      {shown.map((helper) => (
        <div key={helper.id} data-helper={helper.id} style={rowStyle}>
          <AgentSprite subagentType={helper.subagentType || helper.label} size={14} />
          <span style={nameStyle}>{helper.subagentType || helper.label}</span>
          <span style={saidStyle}>{helper.headline}</span>
          {helper.status === 'working' ? (
            <span className="zt-breath" style={markStyle}>
              ●
            </span>
          ) : (
            <span style={markStyle}>✓</span>
          )}
        </div>
      ))}
      {rest > 0 && (
        <div data-more style={moreStyle}>
          +{rest}
        </div>
      )}
    </div>
  )
}

const rootStyle: CSSProperties = {
  flex: '0 0 auto',
  marginTop: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minWidth: 0,
  fontSize: 11.5,
}

const headStyle: CSSProperties = {
  flex: '0 0 auto',
  marginBottom: 2,
  fontSize: 11,
  letterSpacing: '0.08em',
  opacity: 0.55,
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  minWidth: 0,
  padding: '1px 0',
  opacity: 0.7,
}

const nameStyle: CSSProperties = {
  flex: '0 0 auto',
  fontFamily: 'var(--zt-mono)',
  fontSize: 11,
  whiteSpace: 'nowrap',
}

const saidStyle: CSSProperties = {
  flex: '1 1 auto',
  minWidth: 0,
  fontSize: 11,
  opacity: 0.75,
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
}

const markStyle: CSSProperties = {
  flex: '0 0 auto',
  fontSize: 11,
  opacity: 0.6,
}

const moreStyle: CSSProperties = {
  flex: '0 0 auto',
  paddingLeft: 20,
  fontFamily: 'var(--zt-mono)',
  fontSize: 11,
  opacity: 0.5,
}
