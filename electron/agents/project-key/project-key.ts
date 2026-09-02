import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

// A project's own teammates are kept in a folder of the app's, named after the
// project. The project's path cannot be that name: it holds separators, spaces
// and letters some filesystems refuse, and it can be longer than a path limit
// allows. A hash of it is short, safe everywhere, and the same folder always
// lands on the same drawer.
export function projectKey(path: string): string {
  return createHash('sha1').update(resolve(path)).digest('hex')
}
