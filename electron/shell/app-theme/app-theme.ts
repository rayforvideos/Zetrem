import { nativeTheme } from 'electron'
import type { BrowserWindow } from 'electron'
import { CHROME_TOP, CONTROL_SYMBOL, GROUND } from '@/shared/config/theme'
import type { Settings } from '@/entities/settings/model/settings/settings.types'

// Electron's themeSource takes the same three words the setting does, and setting
// it moves both sides at once: prefers-color-scheme in the page, and the OS chrome.
export function wearTheme(theme: Settings['theme']): void {
  nativeTheme.themeSource = theme
}

export function chromeFor(dark: boolean): { ground: string; symbol: string } {
  return dark
    ? { ground: GROUND.dark, symbol: CONTROL_SYMBOL.dark }
    : { ground: GROUND.light, symbol: CONTROL_SYMBOL.light }
}

export function chromeNow(): { ground: string; symbol: string } {
  return chromeFor(nativeTheme.shouldUseDarkColors)
}

// The window paints its own background before the page loads and behind the
// rounded corners, so it has to be repainted whenever the scheme moves.
export function dressWindow(win: BrowserWindow): void {
  if (win.isDestroyed()) return
  const skin = chromeNow()
  win.setBackgroundColor(skin.ground)
  if (process.platform === 'win32') {
    win.setTitleBarOverlay({ color: skin.ground, symbolColor: skin.symbol, height: CHROME_TOP })
  }
}

export function followScheme(win: BrowserWindow): void {
  const dress = (): void => dressWindow(win)
  nativeTheme.on('updated', dress)
  win.once('closed', () => nativeTheme.off('updated', dress))
}
