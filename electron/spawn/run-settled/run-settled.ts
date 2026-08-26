import { spawn } from 'node:child_process'
import { killTree } from '../kill-tree/kill-tree'
import { launchFor } from '../spawn-claude/spawn-claude'
import type { RunSettled } from './run-settled.types'

const running = new Set<number>()

export function trackChild(pid: number): void {
  running.add(pid)
}

export function untrackChild(pid: number): void {
  running.delete(pid)
}

// SIGTERM rather than a kill: an update or a login may be part way through a
// write, and it is given the chance to stop on its own terms.
export function killTrackedChildren(): void {
  for (const pid of running) killTree(pid)
  running.clear()
}

export function runSettled<T>(plan: RunSettled<T>): Promise<T> {
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
      if (child.pid !== undefined) plan.settled?.(child.pid)
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
      // Only give up once the freshly appended chunk has been read through.
      if (plan.cap !== undefined && text.length > plan.cap.bytes) {
        stop(plan.cap.answers(text), false)
      }
    }

    child.stdout.on('data', take)
    // Drained unconditionally: a child that fills a full stderr pipe blocks on
    // write even when nothing here reads the text back.
    child.stderr.on('data', plan.mergeStderr === true ? take : () => undefined)
    child.on('error', (cause: Error) => stop(plan.error(cause), false))
    // 'close' rather than 'exit': stdio has flushed by then, so a fast writer's
    // last chunk is not raced away by the settle.
    child.on('close', (code) => stop(plan.exit(code, text), false))
  })
}
