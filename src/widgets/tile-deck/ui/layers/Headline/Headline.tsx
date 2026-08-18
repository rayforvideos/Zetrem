import type { CSSProperties } from 'react'
import { personaOf, useModel } from '@/entities/agent-session'
import type { AgentSession } from '@/entities/agent-session'
import { AgentSprite } from '@/entities/agent-session/ui/AgentSprite/AgentSprite'
import { modelLabel } from '@/shared/lib/model-label/model-label'
import { X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { StateChip } from '../StateChip/StateChip'
import { t } from '@lingui/core/macro'

type HeadlineProps = {
  session: AgentSession
  withText?: boolean
  onDismiss?: () => void
}

export function Headline({ session, withText = true, onDismiss }: HeadlineProps) {
  const persona = session.subagentType ? personaOf(session.subagentType) : null
  const model = modelLabel(useModel(session.subagentType))
  return (
    <div style={withText ? rootStyle : headerOnlyStyle}>
      <div style={identityStyle}>
        {session.subagentType !== '' && (
          <AgentSprite subagentType={session.subagentType} state={session.status} size={40} />
        )}
        <div style={stackStyle}>
          <span style={nameStyle}>
            {persona ? persona.name : session.label}
            {model !== null && <span style={modelStyle}>{model}</span>}
          </span>
          <span style={assignmentStyle}>{persona ? session.label : session.model}</span>
        </div>
        <StateChip status={session.status} />
        {onDismiss !== undefined && (
          <Button
            variant="quiet"
            size="bare"
            data-dismiss
            onClick={onDismiss}
            aria-label={`Close ${persona ? persona.name : session.label}`}
            title={t`Close this tile. The run stays in the sidebar.`}
            className="zt-hit"
            style={dismissStyle}
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
      {withText && session.headline.length > 0 && (
        <div className="zt-scroll" style={textStyle}>
          {session.headline}
        </div>
      )}
    </div>
  )
}

const rootStyle: CSSProperties = {
  flex: '1 1 auto',
  display: 'flex',
  flexDirection: 'column',
}

const headerOnlyStyle: CSSProperties = {
  flex: '0 0 auto',
  display: 'flex',
  flexDirection: 'column',
}

const identityStyle: CSSProperties = {
  flex: '0 0 auto',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minWidth: 0,
}

const stackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  minWidth: 0,
  flex: '1 1 auto',
}

const dismissStyle: CSSProperties = {
  flex: '0 0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: 0.45,
  cursor: 'pointer',
}

const nameStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 7,
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: '-0.01em',
  minWidth: 0,
  whiteSpace: 'nowrap',
}

const modelStyle: CSSProperties = {
  flex: '0 0 auto',
  fontFamily: 'var(--zt-mono)',
  fontSize: 10,
  fontWeight: 400,
  letterSpacing: '0.04em',
  opacity: 0.55,
}

const assignmentStyle: CSSProperties = {
  fontFamily: 'var(--zt-mono)',
  fontSize: 10.5,
  letterSpacing: '0.02em',
  opacity: 0.55,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const textStyle: CSSProperties = {
  marginTop: 14,
  flex: '1 1 auto',
  minHeight: 0,
  fontFamily: 'var(--zt-serif)',
  fontSize: 15,
  lineHeight: 1.5,
  letterSpacing: '-0.011em',
  paddingRight: 10,
  overflowX: 'hidden',
  overflowY: 'auto',
}
