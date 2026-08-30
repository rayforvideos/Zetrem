import { spawn } from 'node:child_process'
import { accountWorkInFlight } from '../account-work/account-work'
import { goneWatch } from '../gone/gone'
import { killTree } from '../kill-tree/kill-tree'
import { pidAlive } from '../pid-alive/pid-alive'
import { launchFor } from '../spawn-claude/spawn-claude'
import type { RunSettled } from './run-settled.types'

const running = new Set<number>()
const quiet = goneWatch()

export function trackChild(pid: number): void {
  running.add(pid)
}

export function untrackChild(pid: number): void {
  running.delete(pid)
  quiet.note(running.size === 0)
}

export function killTrackedChildren(): void {
  for (const pid of running) killTree(pid)
  running.clear()
  quiet.note(true)
}

// 'close' is the ordinary way out of the set, and it can never come: a
// grandchild that inherited the stdio keeps the pipe open long after the child
// itself has gone. Trusting it alone would refuse every later account operation
// for the life of the app, with nothing a person could do about it, so a pid the
// process table no longer knows is counted as gone.
function forgetTheGone(): void {
  for (const pid of [...running]) {
    if (!pidAlive(pid)) running.delete(pid)
  }
  quiet.note(running.size === 0)
}

// A pid leaves the set when its process has closed, so an empty set is the only
// word this app has that the children are really gone.
// Asked to go, then waited for. One that is still here at the deadline is left
// exactly where it is: the caller's answer is that the children did not go, and
// a hard kill here would take a person's turn for a change that is then refused
// anyway. Whatever is still running at quit is killed there.
export async function stopTrackedChildren(waitMs: number): Promise<boolean> {
  forgetTheGone()
  for (const pid of running) killTree(pid)
  if (await quiet.within(running.size === 0, waitMs)) return true
  forgetTheGone()
  return running.size === 0
}

// The last word on whether a claude may start. Callers ask the latch too, but
// they ask it before working out where and how to run, and that working out
// awaits: an account operation can begin in the gap. This is the only place that
// sits next to the spawn itself, so it is the only place that can be sure.
export function runSettled<T>(plan: RunSettled<T>): Promise<T> {
  if (accountWorkInFlight()) return Promise.resolve(plan.refused())
  return new Promise((resolve) => {
    const launch = launchFor(plan.bin, plan.args)
    const child = spawn(launch.command, launch.args, {
      env: plan.env,
      windowsHide: true,
      ...(plan.cwd === undefined ? {} : { cwd: plan.cwd }),
    })
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    if (child.pid !== undefined) plan.spawned?.(child.pid)

    let text = ''
    let settled = false

    const stop = (value: T, timedOut: boolean): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (timedOut || plan.killOnSettle === true) {
        // SIGTERM on Windows only reaches the cmd.exe wrapper, leaving the
        // real process running; kill the whole tree instead.
        if (child.pid !== undefined) killTree(child.pid)
        else child.kill()
      }
      resolve(value)
    }

    const timer = setTimeout(() => stop(plan.timeout.answers(text), true), plan.timeout.ms)

    const take = (chunk: string): void => {
      if (settled) return
      text += chunk
      if (plan.line !== undefined) {
        const lines = text.split('\n')
        text = lines.pop() ?? ''
        for (const line of lines) {
          const found = plan.line(line)
          if (found !== undefined) {
            stop(found, false)
            return
          }
        }
      }
      if (plan.cap !== undefined && text.length > plan.cap.bytes) {
        stop(plan.cap.answers(text), false)
      }
    }

    child.stdout.on('data', take)
    // Drained unconditionally: a child that fills the stderr pipe blocks on
    // write even when nothing here reads the text back.
    child.stderr.on('data', plan.mergeStderr === true ? take : () => undefined)
    child.on('error', (cause: Error) => stop(plan.error(cause), false))
    // 'close' rather than 'exit': stdio has flushed by then, so a fast writer's
    // last chunk is not raced away by the settle. An answer in hand is not an
    // exit: a killOnSettle run has been asked to go and may still be going, so
    // the caller stops counting it only when the process itself says so.
    child.once('close', (code) => {
      if (child.pid !== undefined) plan.settled?.(child.pid)
      stop(plan.exit(code, text), false)
    })
  })
}
