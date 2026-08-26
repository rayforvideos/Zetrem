import type { Call } from '@/entities/agent-session'
import { AgentSprite } from '@/entities/teammate'
import { targetOf, verbOf } from '@/entities/tool'
import { reachOf } from '@/shared/lib/reach/reach'
import { formatClock } from '@/shared/lib/units/units'
import type { Scene } from '../../../lib/now/now.types'
import { sceneOf, shapeOfCall } from '../../../lib/now/now'

const W = 52
const H = 34

const INK_PAD = 3

const INK_X: Record<Scene, number> = {
  read: 9,
  write: 9,
  run: 7,
  search: 8,
  web: 15,
  summon: 0,
  think: 15,
}

type NowStageProps = { call: Call; live: boolean; nowMs?: number }

export function NowStage({ call, live, nowMs }: NowStageProps) {
  const shape = shapeOfCall(call.line)
  const scene = sceneOf(shape)
  const target = shape.kind === 'plain' ? call.line : targetOf(shape)
  const elapsedMs = live && nowMs !== undefined ? nowMs - call.startedAtMs : null

  return (
    <div data-now-stage={scene} data-live={live || undefined} style={rootStyle}>
      <span aria-hidden style={{ ...trackStyle, width: `${reachOf(elapsedMs ?? 0)}%` }} />
      <span style={{ ...frameStyle, opacity: live ? 1 : 0.4 }}>
        <Picture scene={scene} shape={shape} live={live} />
      </span>
      <span style={wordsStyle}>
        <span style={verbStyle}>{verbOf(shape)}</span>
        <span style={targetStyle}>{target}</span>
      </span>
      {elapsedMs !== null && (
        <span data-elapsed style={elapsedStyle}>
          {formatClock(elapsedMs / 1000)}
        </span>
      )}
    </div>
  )
}

type PictureProps = { scene: Scene; shape: ReturnType<typeof shapeOfCall>; live: boolean }

function Picture({ scene, shape, live }: PictureProps) {
  if (scene === 'summon' && shape.kind === 'agent' && shape.subagentType.length > 0) {
    return (
      <span style={summonStyle}>
        <span style={live ? ringStyle : { ...ringStyle, animation: 'none' }} />
        <AgentSprite subagentType={shape.subagentType} size={20} />
      </span>
    )
  }
  return (
    <svg
      width={FRAME_W}
      height={FRAME_H}
      viewBox={`${INK_X[scene] - INK_PAD} 3 ${W - 12} ${H - 6}`}
      preserveAspectRatio="xMinYMid meet"
      fill="none"
      aria-hidden
    >
      <Drawing scene={scene} live={live} />
    </svg>
  )
}

import { Drawing } from './Drawing'
import {
  elapsedStyle,
  frameStyle,
  ringStyle,
  rootStyle,
  summonStyle,
  targetStyle,
  trackStyle,
  verbStyle,
  wordsStyle,
  FRAME_H,
  FRAME_W,
  ICON_W,
} from './NowStage.styles'

export { ICON_W }
