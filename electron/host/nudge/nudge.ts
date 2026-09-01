import { BrowserWindow, Notification, shell } from 'electron'
import { handle, on } from '../../ipc/ipc'
import { notifyState } from './notify-state/notify-state'

const MAC_NOTIFY_SETTINGS = 'x-apple.systempreferences:com.apple.Notifications-Settings.extension'
const WINDOWS_NOTIFY_SETTINGS = 'ms-settings:notifications'

function said(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}

export function registerNudge(): void {
  handle('nudge:state', () => notifyState())
  on('nudge:settings', () => {
    const place = process.platform === 'darwin' ? MAC_NOTIFY_SETTINGS : WINDOWS_NOTIFY_SETTINGS
    void shell.openExternal(place)
  })
  on('nudge:show', (_event, title: unknown, body: unknown) => {
    if (!Notification.isSupported()) return
    const notice = new Notification({
      title: said(title, 'Zetrem'),
      body: said(body, ''),
      silent: false,
    })
    notice.on('click', () => {
      const [window] = BrowserWindow.getAllWindows()
      if (window === undefined) return
      if (window.isMinimized()) window.restore()
      window.show()
      window.focus()
    })
    notice.show()
  })
}
