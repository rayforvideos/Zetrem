import { access, copyFile, rename, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

const NAME = 'Zetrem Dev'
const OLD_NAME = 'Zetrem'
const STOCK_APP = 'node_modules/electron/dist/Electron.app'
const OLD_APP = `node_modules/electron/dist/${OLD_NAME}.app`
const APP = `node_modules/electron/dist/${NAME}.app`
const PLIST = `${APP}/Contents/Info.plist`
const STOCK_BINARY = `${APP}/Contents/MacOS/Electron`
const OLD_BINARY = `${APP}/Contents/MacOS/${OLD_NAME}`
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
  // migration: an earlier version of this script named the dev app "Zetrem" — pick that up if present
  if ((await there(OLD_APP)) && !(await there(APP))) await rename(OLD_APP, APP)
  if (await there(STOCK_APP)) await rename(STOCK_APP, APP)
  if (!(await there(PLIST))) return

  if (await there(STOCK_BINARY)) await rename(STOCK_BINARY, OUR_BINARY)
  if (await there(OLD_BINARY)) await rename(OLD_BINARY, OUR_BINARY)
  await writeFile(POINTER, `${NAME}.app/Contents/MacOS/${NAME}`)

  await set('CFBundleName', NAME)
  await set('CFBundleDisplayName', NAME)
  await set('CFBundleExecutable', NAME)
  await set('CFBundleIdentifier', 'com.zetrem.dev')
  if (await there(OUR_ICON)) await copyFile(OUR_ICON, DEV_ICON)

  await run('codesign', ['--force', '--sign', '-', '--timestamp=none', APP])
  await run('touch', [APP])
}

main().catch(() => undefined)
