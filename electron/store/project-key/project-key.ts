import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

// A project's own teammates are kept in a folder of the app's, named after the
// project. The project's path cannot be that name: it holds separators, spaces
// and letters some filesystems refuse, and it can be longer than a path limit
// allows. A hash of it is short, safe everywhere, and the same folder always
// lands on the same drawer. resolve() first, so a trailing separator or a
// relative segment names the same folder as its canonical path does.
//
// Hashed the same way transcriptKey hashes a project (sha256 hex, sliced),
// but kept as its own function rather than reused: transcriptKey names an
// on-disk contract — the chat transcript folder that already exists on disk —
// and must never change, while this key is free to move or be reshaped.
export function projectKey(path: string): string {
  return createHash('sha256').update(resolve(path)).digest('hex').slice(0, 32)
}
