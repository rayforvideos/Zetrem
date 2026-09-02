import type { CSSProperties } from 'react'
import type { ChangeCount, DiffLine } from '@/entities/tool'
import { ChangeDiff } from '@/entities/tool'
import { ICON_W } from '../NowStage/NowStage'

// How much of one edit the tile is willing to hold. The report shows the rest.
const GLIMPSE_LINES = 8

// The count of what an edit added and took away, small enough to sit at the
// right edge of the call it belongs to.
export function ChangeMark({ count }: { count: ChangeCount }) {
  return (
    <span data-change-badge style={markStyle}>
      +{count.added} −{count.removed}
    </span>
  )
}

// The edit itself, opened under the call that made it. In CallLog only ever
// one of these is on a tile at a time: the change the teammate has in hand.
// Timeline opens one under every call that changed something, so it passes a
// roomier maxLines of its own instead of the log's tighter default.
export function ChangeGlimpse({
  groups,
  count,
  maxLines = GLIMPSE_LINES,
}: {
  groups: DiffLine[][]
  count?: ChangeCount
  maxLines?: number
}) {
  if (groups.length === 0) return null
  return (
    <div data-change style={rootStyle}>
      {count !== undefined && (
        <span style={headStyle}>
          <ChangeMark count={count} />
        </span>
      )}
      <ChangeDiff groups={groups} maxLines={maxLines} />
    </div>
  )
}

const rootStyle: CSSProperties = {
  flex: '0 0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  marginLeft: ICON_W,
  marginBottom: 2,
  opacity: 0.8,
}

const headStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  paddingRight: 4,
}

const markStyle: CSSProperties = {
  flex: '0 0 auto',
  fontFamily: 'var(--zt-mono)',
  fontVariantNumeric: 'tabular-nums',
  fontSize: 11,
  opacity: 0.7,
  whiteSpace: 'nowrap',
}
