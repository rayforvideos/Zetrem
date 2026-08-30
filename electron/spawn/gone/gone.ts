import type { GoneWatch } from './gone.types'

// Waiting for a child to die is waiting for an event that may never come, so
// every wait here carries a deadline and says which of the two happened.
export function goneWatch(): GoneWatch {
  const waiting = new Set<() => void>()
  return {
    note(empty: boolean): void {
      if (!empty) return
      const woken = [...waiting]
      waiting.clear()
      for (const wake of woken) wake()
    },
    within(empty: boolean, ms: number): Promise<boolean> {
      if (empty) return Promise.resolve(true)
      return new Promise<boolean>((resolve) => {
        let timer: ReturnType<typeof setTimeout> | undefined
        const wake = (): void => {
          clearTimeout(timer)
          resolve(true)
        }
        timer = setTimeout(() => {
          waiting.delete(wake)
          resolve(false)
        }, ms)
        waiting.add(wake)
      })
    },
  }
}
