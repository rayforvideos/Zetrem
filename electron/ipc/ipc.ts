import { BrowserWindow, ipcMain } from 'electron'
import type { IpcMainEvent, IpcMainInvokeEvent, WebContents } from 'electron'
import type {
  InvokeChannel,
  Invokes,
  PushChannel,
  Pushes,
  SendChannel,
  Sends,
} from '@/entities/desk/desk.types'

type Sender = {
  readonly hasWindow: boolean
  readonly isMainFrame: boolean
}

export function trusted(sender: Sender): boolean {
  return sender.hasWindow && sender.isMainFrame
}

function senderOf(event: IpcMainInvokeEvent | IpcMainEvent): Sender {
  return {
    hasWindow: BrowserWindow.fromWebContents(event.sender) !== null,
    isMainFrame: event.senderFrame === event.sender.mainFrame,
  }
}

// The handler is typed by its channel: the arguments are what the renderer
// sends and the return is what it awaits, both from desk.types.ts. The
// values still arrive over a wire the renderer controls, so a handler that
// cares about shape keeps validating what it gets.
type Handler<C extends InvokeChannel> = (
  event: IpcMainInvokeEvent,
  ...args: Parameters<Invokes[C]>
) => ReturnType<Invokes[C]> | Promise<ReturnType<Invokes[C]>>

type Listener<C extends SendChannel> = (event: IpcMainEvent, ...args: Parameters<Sends[C]>) => void

export function handle<C extends InvokeChannel>(channel: C, listener: Handler<C>): void {
  ipcMain.handle(channel, (event, ...args) => {
    if (!trusted(senderOf(event))) throw new Error(`refused ${channel}: untrusted sender`)
    return listener(event, ...(args as Parameters<Invokes[C]>))
  })
}

export function on<C extends SendChannel>(channel: C, listener: Listener<C>): void {
  ipcMain.on(channel, (event, ...args) => {
    if (!trusted(senderOf(event))) return
    listener(event, ...(args as Parameters<Sends[C]>))
  })
}

// Main speaking to a page. A page that has gone away is skipped rather than
// thrown at, since the push usually comes from a child process callback that
// outlives the window.
export function push<C extends PushChannel>(
  target: WebContents,
  channel: C,
  payload: Pushes[C],
): void {
  if (target.isDestroyed()) return
  target.send(channel, payload)
}
