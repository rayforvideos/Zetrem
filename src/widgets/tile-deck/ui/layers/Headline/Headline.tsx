import type { CSSProperties } from 'react'
import { AgentSprite, personaOf, useModel } from '@/entities/teammate'
import type { AgentSession } from '@/entities/agent-session'
import { modelWordFromCli } from '@/entities/settings'
import { modelLabel } from '@/shared/lib/model-label/model-label'
import { MoreHorizontal, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Markdown } from '@/shared/markdown/Markdown/Markdown'
import { StateChip } from '../StateChip/StateChip'
import { t } from '@lingui/core/macro'

type HeadlineProps = {
  session: AgentSession
  withText?: boolean
  // The run this teammate belongs to has stopped for the person.
  held?: boolean
  onDismiss?: () => void
  // Puts this teammate's crew log on the clipboard, so a tile that will not
  // move is a paste rather than a reproduction attempt.
  onCopyDiagnostics?: () => void
}

export function Headline({
  session,
  withText = true,
  held = false,
  onDismiss,
  onCopyDiagnostics,
}: HeadlineProps) {
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
          <span style={assignmentStyle}>
            {persona ? session.label : (modelWordFromCli(session.model) ?? session.label)}
          </span>
        </div>
        <StateChip status={session.status} held={held} />
        {onCopyDiagnostics !== undefined && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="quiet"
                size="bare"
                data-tile-menu
                aria-label={t`More for ${persona ? persona.name : session.label}`}
                className="zt-hit"
                style={tileButtonStyle}
              >
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={onCopyDiagnostics}>
                {t`Copy diagnostics`}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {onDismiss !== undefined && (
          <Button
            variant="quiet"
            size="bare"
            data-dismiss
            onClick={onDismiss}
            aria-label={t`Close ${persona ? persona.name : session.label}`}
            title={t`Close this tile. The run stays in the sidebar.`}
            className="zt-hit"
            style={tileButtonStyle}
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
      {withText && session.headline.length > 0 && (
        <div className="zt-scroll" style={textStyle}>
          <Markdown text={session.headline} />
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

// The small round buttons in the tile header: the menu, and the close.
const tileButtonStyle: CSSProperties = {
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
