// The renderer cannot reach node:path, and a path it is handed may have come
// from either kind of machine. Split on both separators rather than assuming one.
export function baseName(path: string): string {
  const parts = path.split(/[/\\]+/).filter((part) => part.length > 0)
  return parts.at(-1) ?? path
}
