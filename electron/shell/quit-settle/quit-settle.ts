import type { QuitSettle, QuitSettleDeps } from './quit-settle.types'

type Stage = 'idle' | 'settling' | 'settled'

// A quit waits on writes and servers that may never settle: a stuck queue, or
// an http.Server whose close callback never comes while a session still holds
// a connection. So the wait carries a deadline, and the quit goes through
// either way. A second before-quit during the wait is held without starting
// the wait over.
export function quitSettle(deps: QuitSettleDeps): QuitSettle {
  let stage: Stage = 'idle'

  function begin(): void {
    stage = 'settling'
    let timer: ReturnType<typeof setTimeout> | undefined
    const late = new Promise<'late'>((resolve) => {
      timer = setTimeout(() => resolve('late'), deps.deadlineMs)
    })
    const done = deps.settle().then(
      () => 'done' as const,
      () => 'done' as const,
    )
    Promise.race([done, late]).then((first) => {
      clearTimeout(timer)
      if (first === 'late') deps.late()
      stage = 'settled'
      deps.quit()
    })
  }

  return {
    hold(): boolean {
      switch (stage) {
        case 'settled':
          return false
        case 'settling':
          return true
        case 'idle':
          begin()
          return true
      }
    },
  }
}
