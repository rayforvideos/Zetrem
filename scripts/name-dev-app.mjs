import { access, copyFile, rename, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

const NAME = 'Zetrem'
const STOCK_APP = 'node_modules/electron/dist/Electron.app'
const APP = `node_modules/electron/dist/${NAME}.app`
const PLIST = `${APP}/Contents/Info.plist`
const STOCK_BINARY = `${APP}/Contents/MacOS/Electron`
const OUR_BINARY = `${APP}/Contents/MacOS/${NAME}`
const POINTER = 'node_modules/electron/path.txt'
const DEV_ICON = `${APP}/Contents/Resources/electron.icns`
const OUR_ICON = 'resources/icon.icns'

async function there(path) {
  return access(path).then(
    () => true,
    () => false,
  )
}

async function set(key, value) {
  await run('plutil', ['-replace', key, '-string', value, PLIST])
}

async function main() {
  if (process.platform !== 'darwin') return
  if (await there(STOCK_APP)) await rename(STOCK_APP, APP)
  if (!(await there(PLIST))) return

  if (await there(STOCK_BINARY)) await rename(STOCK_BINARY, OUR_BINARY)
  await writeFile(POINTER, `${NAME}.app/Contents/MacOS/${NAME}`)

  await set('CFBundleName', NAME)
  await set('CFBundleDisplayName', NAME)
  await set('CFBundleExecutable', NAME)
  await set('CFBundleIdentifier', 'com.zetrem.app')
  if (await there(OUR_ICON)) await copyFile(OUR_ICON, DEV_ICON)

  await run('codesign', ['--force', '--sign', '-', '--timestamp=none', APP])
  await run('touch', [APP])
}

main().catch(() => undefined)
