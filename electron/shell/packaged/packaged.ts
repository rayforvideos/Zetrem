import { basename } from 'node:path'
import { app } from 'electron'

// app.isPackaged answers from the name of the executable: anything not called
// Electron is taken for a shipped app. The dev app is renamed so the Dock can
// tell it from the real one, and from then on isPackaged said yes to both.
// What the two callers actually want to know is whether the app was loaded
// from the archive electron-builder writes, which only a shipped build has.
export function loadedFromAsar(appPath: string): boolean {
  return basename(appPath.replaceAll('\\', '/')) === 'app.asar'
}

export function isPackagedRun(): boolean {
  return loadedFromAsar(app.getAppPath())
}
