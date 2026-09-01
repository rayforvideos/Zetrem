import type { LaneRow } from './graph.types'

type Bone = { sha: string; parents: string[] }

// Classic lane assignment over a topological order (children before
// parents): each lane holds the sha it expects next; a commit lands in the
// first lane expecting it, folds every other lane expecting it, hands its
// lane on to its first parent, and opens lanes for the parents beyond.
export function laneRows(bones: Bone[]): LaneRow[] {
  const lanes: (string | null)[] = []
  const rows: LaneRow[] = []

  const freeLane = (): number => {
    const open = lanes.indexOf(null)
    if (open >= 0) return open
    lanes.push(null)
    return lanes.length - 1
  }

  for (const bone of bones) {
    const waiting = lanes.flatMap((sha, at) => (sha === bone.sha ? [at] : []))
    const up = waiting.length > 0
    const lane = waiting[0] ?? freeLane()
    const tops = waiting.slice(1)
    for (const gone of tops) lanes[gone] = null

    const [first, ...rest] = bone.parents
    lanes[lane] = first ?? null

    const bottoms: number[] = []
    for (const parent of rest) {
      const already = lanes.indexOf(parent)
      if (already >= 0 && already !== lane) {
        bottoms.push(already)
        continue
      }
      const opened = freeLane()
      lanes[opened] = parent
      bottoms.push(opened)
    }

    const throughs = lanes.flatMap((sha, at) =>
      sha !== null && at !== lane && !bottoms.includes(at) ? [at] : [],
    )

    rows.push({
      sha: bone.sha,
      lane,
      tops,
      bottoms,
      throughs,
      up,
      down: first !== undefined,
      width: 0,
    })
  }

  const width = Math.max(1, lanes.length)
  return rows.map((row) => ({ ...row, width }))
}
