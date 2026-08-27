import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import type { InvokeChannel, Invokes, SendChannel, Sends } from '@/app/desk/desk.types'

export type Sender = {
  readonly hasWindow: boolean
  readonly isMainFrame: boolean
}

export type Handler<C extends InvokeChannel> = (
  event: IpcMainInvokeEvent,
  ...args: Parameters<Invokes[C]>
) => ReturnType<Invokes[C]> | Promise<ReturnType<Invokes[C]>>

export type Listener<C extends SendChannel> = (
  event: IpcMainEvent,
  ...args: Parameters<Sends[C]>
) => void
