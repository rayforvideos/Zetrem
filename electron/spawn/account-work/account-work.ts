// An account operation moves the credentials every claude on this machine
// shares, and a browser login holds it open for minutes. A child started in
// that window refreshes the account that is leaving into the file the account
// that is arriving is about to be filed from, which is the very loss stopping
// the children was meant to prevent. So the whole operation is one latch, and
// every place that would spawn a claude asks here first. The login the
// operation runs itself is the one child that belongs inside the window.
let held = 0

export function accountWorkInFlight(): boolean {
  return held > 0
}

// The latch is released on every way out, including a throw: an operation that
// died holding it would leave the app unable to spawn anything ever again.
export async function duringAccountWork<T>(work: () => Promise<T>): Promise<T> {
  held += 1
  try {
    return await work()
  } finally {
    held -= 1
  }
}
