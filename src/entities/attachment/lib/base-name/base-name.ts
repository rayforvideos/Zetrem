// The renderer cannot reach node:path, and a path may come from either kind of machine.
export function baseName(path: string): string {
  const parts = path.split(/[/\\]+/).filter((part) => part.length > 0)
  return parts.at(-1) ?? path
}
