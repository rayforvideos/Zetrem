import { BrowserWindow, ipcMain } from 'electron'
import type { IpcMainEvent, IpcMainInvokeEvent, WebContents } from 'electron'
import type {
  InvokeChannel,
  Invokes,
  PushChannel,
  Pushes,
  SendChannel,
  Sends,
} from '@/app/desk/desk.types'
import type { Handler, Listener, Sender } from './ipc.types'

export function trusted(sender: Sender): boolean {
  return sender.hasWindow && sender.isMainFrame
}

function senderOf(event: IpcMainInvokeEvent | IpcMainEvent): Sender {
  return {
    hasWindow: BrowserWindow.fromWebContents(event.sender) !== null,
    isMainFrame: event.senderFrame === event.sender.mainFrame,
  }
}

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

export function push<C extends PushChannel>(
  target: WebContents,
  channel: C,
  payload: Pushes[C],
): void {
  if (target.isDestroyed()) return
  target.send(channel, payload)
}
