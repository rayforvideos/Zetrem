import type { CSSProperties } from 'react'
import { personaOf } from '@/entities/agent-session'
import type { AgentSession } from '@/entities/agent-session'
import { AgentFace } from '@/shared/ui/agent-face'

type HeadlineProps = {
  session: AgentSession
  withText?: boolean
}

export function Headline({ session, withText = true }: HeadlineProps) {
  const persona = session.subagentType ? personaOf(session.subagentType) : null
  return (
    <div style={rootStyle}>
      <div style={nameStyle}>
        {persona && <AgentFace persona={persona} size={18} />}
        <span data-dot style={dotStyle(session.status)} />
        <span style={labelStyle}>{persona ? persona.name : session.label}</span>
        <span style={modelStyle}>{persona ? session.label : session.model}</span>
      </div>
      {withText && session.headline.length > 0 && (
        <div style={textStyle}>{session.headline}</div>
      )}
    </div>
  )
}

function dotStyle(status: AgentSession['status']): CSSProperties {
  const base: CSSProperties = {
    width: 6,
    height: 6,
    borderRadius: 3,
    flex: '0 0 auto',
    alignSelf: 'center',
  }
  if (status === 'working') {
    return { ...base, background: 'currentColor' }
  }
  if (status === 'waiting') {
    return { ...base, border: '1.5px solid currentColor', background: 'transparent' }
  }
  return { ...base, background: 'currentColor', opacity: 0.35 }
}

const rootStyle: CSSProperties = {
  position: 'relative',
  zIndex: 3,
  paddingRight: 150,
}

const nameStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 7,
  fontSize: 12.5,
  fontWeight: 600,
  letterSpacing: '-0.01em',
  minWidth: 0,
}

const labelStyle: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const modelStyle: CSSProperties = { fontSize: 11, fontWeight: 400, letterSpacing: '0.04em' }

const textStyle: CSSProperties = {
  marginTop: 8,
  fontFamily: 'var(--zt-serif)',
  fontSize: 14.5,
  lineHeight: 1.5,
  letterSpacing: '-0.011em',
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}
