import type { CSSProperties } from 'react'
import type { Call } from '@/entities/agent-session'
import { AgentSprite } from '@/entities/agent-session/ui/AgentSprite/AgentSprite'
import { targetOf, verbOf } from '@/shared/lib/tool-verb/tool-verb'
import { formatClock } from '@/shared/lib/units/units'
import type { Scene } from '../../../lib/now/now.types'
import { sceneOf, shapeOfCall } from '../../../lib/now/now'

const W = 52
const H = 34

type NowStageProps = { call: Call; live: boolean; nowMs?: number }

export function NowStage({ call, live, nowMs }: NowStageProps) {
  const shape = shapeOfCall(call.line)
  const scene = sceneOf(shape)
  const target = shape.kind === 'plain' ? call.line : targetOf(shape)

  return (
    <div data-now-stage={scene} data-live={live || undefined} style={rootStyle}>
      <span style={{ ...frameStyle, opacity: live ? 1 : 0.4 }}>
        <Picture scene={scene} shape={shape} live={live} />
      </span>
      <span style={wordsStyle}>
        <span style={verbStyle}>{verbOf(shape)}</span>
        <span style={targetStyle}>{target}</span>
      </span>
      {live && nowMs !== undefined && (
        <span data-elapsed style={elapsedStyle}>
          {formatClock((nowMs - call.startedAtMs) / 1000)}
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
        <AgentSprite subagentType={shape.subagentType} size={26} />
      </span>
    )
  }
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" aria-hidden>
      <Drawing scene={scene} live={live} />
    </svg>
  )
}

function Drawing({ scene, live }: { scene: Scene; live: boolean }) {
  const rule = { stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const }
  const page = (
    <>
      <rect x={9} y={4} width={34} height={26} rx={3} stroke="currentColor" strokeWidth={1.25} opacity={0.45} />
      {[10, 15, 20, 25].map((y) => (
        <line key={y} x1={14} y1={y} x2={y === 25 ? 30 : 38} y2={y} {...rule} opacity={0.35} />
      ))}
    </>
  )

  switch (scene) {
    case 'read':
      return (
        <>
          {page}
          <rect
            x={12}
            y={7}
            width={28}
            height={5}
            rx={1.5}
            fill="currentColor"
            opacity={0.28}
            style={motion(live, 'zt-now-scan 2.4s ease-in-out infinite')}
          />
        </>
      )
    case 'write':
      return (
        <>
          {page}
          <line
            x1={14}
            y1={20}
            x2={34}
            y2={20}
            {...rule}
            opacity={0.9}
            style={motion(live, 'zt-now-grow 1.8s ease-in-out infinite', 'left center')}
          />
          <line
            x1={36}
            y1={16}
            x2={36}
            y2={24}
            {...rule}
            style={motion(live, 'zt-pulse 1s steps(1, end) infinite')}
          />
        </>
      )
    case 'run':
      return (
        <>
          <rect x={7} y={5} width={38} height={24} rx={3} stroke="currentColor" strokeWidth={1.25} opacity={0.45} />
          <path d="M12 12 L16 15.5 L12 19" {...rule} opacity={0.8} />
          {[0, 1, 2, 3].map((at) => (
            <rect
              key={at}
              x={20 + at * 6}
              y={14}
              width={4}
              height={3}
              rx={1}
              fill="currentColor"
              opacity={0.7}
              style={motion(live, `zt-now-tick 1.4s ease-in-out ${at * 0.14}s infinite`)}
            />
          ))}
          <line x1={12} y1={24} x2={20} y2={24} {...rule} opacity={0.3} />
        </>
      )
    case 'search':
      return (
        <>
          {[9, 15, 21, 27].map((y, at) => (
            <line key={y} x1={8} y1={y} x2={at % 2 === 0 ? 44 : 36} y2={y} {...rule} opacity={0.3} />
          ))}
          <g style={motion(live, 'zt-now-sweep 2.6s ease-in-out infinite')}>
            <circle cx={16} cy={17} r={7} stroke="currentColor" strokeWidth={1.5} opacity={0.95} />
            <line x1={21} y1={22} x2={25} y2={26} {...rule} opacity={0.95} />
          </g>
        </>
      )
    case 'web':
      return (
        <>
          <circle cx={26} cy={17} r={11} stroke="currentColor" strokeWidth={1.25} opacity={0.45} />
          <ellipse cx={26} cy={17} rx={4.5} ry={11} stroke="currentColor" strokeWidth={1.25} opacity={0.35} />
          <line x1={15} y1={17} x2={37} y2={17} {...rule} opacity={0.35} />
          <g style={motion(live, 'zt-now-orbit 3s linear infinite')} transform-origin="26 17">
            <circle cx={26} cy={6} r={2.5} fill="currentColor" />
          </g>
        </>
      )
    default:
      return (
        <>
          {[0, 1, 2].map((at) => (
            <circle
              key={at}
              cx={18 + at * 8}
              cy={17}
              r={2.5}
              fill="currentColor"
              opacity={0.7}
              style={motion(live, `zt-now-tick 1.5s ease-in-out ${at * 0.18}s infinite`)}
            />
          ))}
        </>
      )
  }
}

function motion(live: boolean, animation: string, origin?: string): CSSProperties {
  if (!live) return {}
  if (origin === undefined) return { animation }
  return { animation, transformBox: 'fill-box', transformOrigin: origin }
}

const rootStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minWidth: 0,
  flex: '0 0 auto',
  padding: '4px 5px',
  borderRadius: 6,
}

const frameStyle: CSSProperties = {
  flex: '0 0 auto',
  width: W,
  height: H,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'opacity 400ms ease',
}

const summonStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: W,
  height: H,
}

const ringStyle: CSSProperties = {
  position: 'absolute',
  width: 30,
  height: 30,
  borderRadius: '50%',
  border: '1px solid currentColor',
  animation: 'zt-now-ring 2s ease-out infinite',
}

const elapsedStyle: CSSProperties = {
  flex: '0 0 auto',
  marginLeft: 'auto',
  paddingLeft: 8,
  fontFamily: 'var(--zt-mono)',
  fontVariantNumeric: 'tabular-nums',
  fontSize: 11,
  opacity: 0.5,
}

const wordsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  minWidth: 0,
}

const verbStyle: CSSProperties = { fontSize: 12.5 }

const targetStyle: CSSProperties = {
  fontFamily: 'var(--zt-mono)',
  fontSize: 11,
  opacity: 0.55,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}
