import { shortPath } from '@/entities/agent-def'
import type { ToolShape } from '@/entities/tool'

// Every row of a run starts from the same project root, so a row that repeats
// it spends its width on the one part that is never news, and a single find
// wraps onto a second line. A path from outside the project keeps its whole
// self, because out there the root is the news.
export function nearShape(shape: ToolShape, project: string | null): ToolShape {
  if (shape.kind === 'file') {
    const short = shortPath(`${shape.dir}${shape.name}`, project)
    const cut = short.lastIndexOf('/')
    return cut === -1
      ? { ...shape, dir: '', name: short }
      : { ...shape, dir: short.slice(0, cut + 1), name: short.slice(cut + 1) }
  }
  if (shape.kind === 'search' && shape.scope.length > 0) {
    return { ...shape, scope: shortPath(shape.scope, project) }
  }
  return shape
}
