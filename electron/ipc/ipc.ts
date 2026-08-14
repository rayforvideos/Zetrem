import { BrowserWindow, ipcMain } from 'electron'
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron'

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

export function handle(
  channel: string,
  listener: (event: IpcMainInvokeEvent, ...args: never[]) => unknown,
): void {
  ipcMain.handle(channel, (event, ...args) => {
    if (!trusted(senderOf(event))) throw new Error(`refused ${channel}: untrusted sender`)
    return listener(event, ...(args as never[]))
  })
}

export function on(
  channel: string,
  listener: (event: IpcMainEvent, ...args: never[]) => void,
): void {
  ipcMain.on(channel, (event, ...args) => {
    if (!trusted(senderOf(event))) return
    listener(event, ...(args as never[]))
  })
}
