import type { Step } from './next-step.types'

// Switching, removing or re-authenticating changes or revokes the
// credential a live Claude Code session in this window is using, so it
// asks first. With no session live there is nothing running to disturb,
// so the action goes straight through.
export function nextStep<T>(sessionLive: boolean, action: T): Step<T> {
  return sessionLive ? { confirm: action } : { run: action }
}
