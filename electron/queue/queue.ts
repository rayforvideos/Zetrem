import type { Queue } from './queue.types'

export function queue(): Queue {
  let tail: Promise<unknown> = Promise.resolve()

  return function next<T>(work: () => Promise<T>): Promise<T> {
    const run = tail.then(work, work)
    tail = run.catch(() => undefined)
    return run
  }
}
