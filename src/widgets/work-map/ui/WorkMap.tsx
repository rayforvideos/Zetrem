import { personaOf } from '@/entities/agent-session'
import type { AgentSession } from '@/entities/agent-session'
import { AgentFace } from '@/shared/ui/agent-face'
import { workMap } from '../lib/branches'
import type { Branch } from '../lib/branches'

const LANE_H = 30
const TOP = 30

type WorkMapProps = {
  sessions: AgentSession[]
  nowMs: number
}

export function WorkMap({ sessions, nowMs }: WorkMapProps) {
  const map = workMap(sessions, nowMs)
  if (map.branches.length === 0) return null

  return (
    <div
      className="relative flex-none"
      style={{ height: TOP + map.lanes * LANE_H }}
      data-work-map
    >
      <div className="absolute inset-x-0 top-0 h-px bg-border" />
      {map.branches.map((branch) => (
        <Lane key={branch.id} branch={branch} />
      ))}
    </div>
  )
}

function Lane({ branch }: { branch: Branch }) {
  const top = TOP + branch.lane * LANE_H
  const persona = personaOf(branch.subagentType || branch.label)
  const bright = branch.status === 'done' ? 0.3 : 0.7

  return (
    <>
      <div
        className="absolute"
        style={{
          left: `${branch.startX * 100}%`,
          width: `${Math.max(branch.endX - branch.startX, 0.004) * 100}%`,
          top,
          height: branch.status === 'waiting' ? 0 : 2,
          borderRadius: 1,
          background: branch.status === 'waiting' ? undefined : 'currentColor',
          borderTop: branch.status === 'waiting' ? '1.5px dotted currentColor' : undefined,
          opacity: branch.status === 'waiting' ? 0.45 : bright,
        }}
      />
      {!branch.live && (
        <div
          className="absolute rounded-full bg-current"
          style={{
            left: `${branch.endX * 100}%`,
            top: top - 1.5,
            width: 5,
            height: 5,
            marginLeft: -2.5,
            opacity: bright,
          }}
        />
      )}
      <div
        className="absolute flex items-center gap-1.5"
        style={{ left: `${branch.startX * 100}%`, top: top - 20, paddingLeft: 5 }}
      >
        <AgentFace persona={persona} size={13} />
        <span
          className="text-xs whitespace-nowrap"
          style={{ opacity: branch.live ? 0.75 : 0.4 }}
        >
          {persona.name}
        </span>
      </div>
    </>
  )
}
