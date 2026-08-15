const PREFIX = 'agent-'

export function copyNameOf(taskId: string): string {
  return `${PREFIX}${taskId}`
}

export function branchOf(taskId: string): string {
  return `worktree-${copyNameOf(taskId)}`
}

export function outcomeOf(counted: string, dirty: string): { commits: number; dirtyFiles: number } {
  return { commits: countOf(counted), dirtyFiles: linesOf(dirty) }
}

function countOf(text: string): number {
  const found = /\d+/.exec(text.trim())
  return found === null ? 0 : Number(found[0])
}

function linesOf(text: string): number {
  return text.split('\n').filter((line) => line.trim().length > 0).length
}
