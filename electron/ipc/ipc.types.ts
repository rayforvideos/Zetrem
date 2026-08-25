import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import type {
  InvokeChannel,
  Invokes,
  SendChannel,
  Sends,
} from '@/entities/desk/desk.types'

export type Sender = {
  readonly hasWindow: boolean
  readonly isMainFrame: boolean
}

// A handler is typed by its channel: the arguments are what the renderer
// sends and the return is what it awaits, both from desk.types.ts. The values
// still arrive over a wire the renderer controls, so a handler that cares
// about shape reads them as unknown and checks.
export type Handler<C extends InvokeChannel> = (
  event: IpcMainInvokeEvent,
  ...args: Parameters<Invokes[C]>
) => ReturnType<Invokes[C]> | Promise<ReturnType<Invokes[C]>>

export type Listener<C extends SendChannel> = (
  event: IpcMainEvent,
  ...args: Parameters<Sends[C]>
) => void
