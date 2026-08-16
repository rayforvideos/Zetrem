import type { CSSProperties } from 'react'
import { useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { AgentSession } from '@/entities/agent-session'
import { AgentSprite } from '@/entities/agent-session/ui/AgentSprite/AgentSprite'
import type { FaceId } from '@/entities/user'
import { Button } from '@/shared/ui/button'
import { attentionId } from '../../lib/attention/attention'
import type { Rect } from '../../lib/grid/grid.types'
import { headcount } from '../../lib/headcount/headcount'
import { laneOf } from '../../lib/lane/lane'
import { CrewBoard } from '../CrewBoard/CrewBoard'

type CrewSheetProps = {
  sessions: AgentSession[]
  bar: Rect
  sheet: Rect
  nowMs: number
  face: FaceId
  name: string
  open: boolean
  openId: string | null
  onToggle(): void
  onClose(): void
  onOpen(id: string | null): void
}

export function CrewSheet({
  sessions,
  bar,
  sheet,
  nowMs,
  face,
  name,
  open,
  openId,
  onToggle,
  onClose,
  onOpen,
}: CrewSheetProps) {
  const eye = attentionId(sessions)
  const first = sessions.find((session) => session.id === eye) ?? sessions[0]

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <Button
        data-crew-bar={sessions.length}
        data-open={open || undefined}
        variant="ghost"
        size="bare"
        onPointerDown={(event) => {
          if (event.button === 0) onToggle()
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          onToggle()
        }}
        aria-expanded={open}
        style={{
          ...barStyle,
          transform: `translate(${bar.x}px, ${bar.y}px)`,
          width: bar.w,
          height: bar.h,
        }}
      >
        {first !== undefined && (
          <AgentSprite
            subagentType={first.subagentType || first.label}
            state={first.status}
            size={20}
          />
        )}
        <span style={countStyle}>{headcount(sessions)}</span>
        {first !== undefined && !open && (
          <span data-doing style={doingStyle}>
            {laneOf(first, nowMs).verb} {laneOf(first, nowMs).target}
          </span>
        )}
        <span style={chevronStyle}>
          {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </span>
      </Button>

      {open && (
        <div
          data-crew-drop
          style={{
            ...dropStyle,
            transform: `translate(${sheet.x}px, ${sheet.y}px)`,
            width: sheet.w,
            height: sheet.h,
          }}
        >
          <div className="zt-rise" style={riseStyle}>
            <CrewBoard
              sessions={sessions}
              rect={{ x: 0, y: 0, w: sheet.w, h: sheet.h }}
              nowMs={nowMs}
              face={face}
              name={name}
              heading={false}
              openId={openId}
              onOpen={onOpen}
            />
          </div>
        </div>
      )}
    </>
  )
}

const riseStyle: CSSProperties = { position: 'absolute', inset: 0 }

const barStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  zIndex: 4,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minWidth: 0,
  padding: '0 12px',
  borderRadius: 12,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'var(--color-border)',
  background: 'var(--color-card)',
  fontSize: 12,
  textAlign: 'left',
}

const countStyle: CSSProperties = { flex: '0 0 auto' }

const doingStyle: CSSProperties = {
  flex: '1 1 auto',
  minWidth: 0,
  opacity: 0.6,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const chevronStyle: CSSProperties = { marginLeft: 'auto', flex: '0 0 auto', opacity: 0.6 }

const dropStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  zIndex: 3,
}
