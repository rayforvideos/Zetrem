const WRITE_TOOLS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'Bash']

// An empty pick means "everything the session has," which always includes a
// writing tool, so it counts as writing too.
export function writes(tools: string[]): boolean {
  if (tools.length === 0) return true
  return tools.some((tool) => WRITE_TOOLS.includes(tool))
}
