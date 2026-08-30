// Whether the operating system still knows this pid. A child's 'close' can fail
// to arrive for good — a grandchild that inherited the stdio holds the pipe open
// after the child itself has gone, and the tree was walked once — so the process
// table is the second opinion on a child that has been asked to stop and is
// still being counted.
export function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (cause: unknown) {
    // EPERM is somebody else's process, which is still a process.
    return (cause as NodeJS.ErrnoException).code !== 'ESRCH'
  }
}
