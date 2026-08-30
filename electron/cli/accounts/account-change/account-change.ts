import { forgetKeptUsage } from '../../../store/kept-usage/kept-usage'

let changes = 0

// The number of times the login on this machine has moved. Anything the main
// process worked out for whoever was signed in carries the count it was
// worked out under, so work in flight across a change can be told apart from
// work started after it.
export function accountChanges(): number {
  return changes
}

// One event: the account changed. Everything derived from who is signed in is
// invalidated here, so no caller has to remember a switch happened.
export async function accountChanged(): Promise<void> {
  changes += 1
  await forgetKeptUsage()
}
