import { BrowserWindow, Notification } from 'electron'
import { on } from './ipc/ipc'

function said(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}

export function registerNudge(): void {
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
