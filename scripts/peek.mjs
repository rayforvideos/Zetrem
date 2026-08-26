import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const ACTIVE_PORT = join(
  homedir(),
  'Library',
  'Application Support',
  'Zetrem',
  'DevToolsActivePort',
)

function livePort() {
  if (process.env.ZT_INSPECT) return process.env.ZT_INSPECT
  try {
    const said = readFileSync(ACTIVE_PORT, 'utf8').split('\n')[0]?.trim()
    if (said && /^\d+$/.test(said)) return said
  } catch {
    // the app has not written one yet
  }
  return '9222'
}

const ORIGIN = `http://127.0.0.1:${livePort()}`

async function target() {
  const res = await fetch(`${ORIGIN}/json`)
  const pages = (await res.json()).filter((one) => one.type === 'page')
  const page = pages.find((one) => one.url.startsWith('http')) ?? pages[0]
  if (page === undefined)
    throw new Error(`no page on ${ORIGIN}. Is the app running with ZT_INSPECT?`)
  return page.webSocketDebuggerUrl
}

function open(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url)
    const waiting = new Map()
    let next = 0

    socket.addEventListener('message', (event) => {
      const frame = JSON.parse(event.data)
      const seat = waiting.get(frame.id)
      if (seat === undefined) return
      waiting.delete(frame.id)
      if (frame.error) seat.reject(new Error(frame.error.message))
      else seat.resolve(frame.result)
    })
    socket.addEventListener('error', () => reject(new Error(`cannot reach ${url}`)))
    socket.addEventListener('open', () =>
      resolve({
        send(method, params = {}) {
          const id = ++next
          socket.send(JSON.stringify({ id, method, params }))
          return new Promise((ok, no) => waiting.set(id, { resolve: ok, reject: no }))
        },
        close: () => socket.close(),
      }),
    )
  })
}

async function evaluate(page, expression) {
  const { result, exceptionDetails } = await page.send('Runtime.evaluate', {
    expression: `(async () => eval(${JSON.stringify(expression)}))()`,
    awaitPromise: true,
    returnByValue: true,
  })
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? 'threw')
  return result.value
}

async function shoot(page, path) {
  await page.send('Page.bringToFront')
  const { data } = await page.send('Page.captureScreenshot', { format: 'png', fromSurface: false })
  writeFileSync(path, Buffer.from(data, 'base64'))
  return path
}

const [verb, ...rest] = process.argv.slice(2)
const page = await open(await target())

switch (verb) {
  case 'shot': {
    console.log(await shoot(page, rest[0] ?? 'peek.png'))
    break
  }
  case 'eval': {
    const value = await evaluate(page, rest.join(' '))
    console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2))
    break
  }
  case 'say': {
    await page.send('Page.bringToFront')
    await evaluate(page, "document.querySelector('textarea')?.focus()")
    await page.send('Input.insertText', { text: rest.join(' ') })
    for (const type of ['keyDown', 'keyUp']) {
      await page.send('Input.dispatchKeyEvent', {
        type,
        key: 'Enter',
        code: 'Enter',
        windowsVirtualKeyCode: 13,
        nativeVirtualKeyCode: 13,
        modifiers: 4,
      })
    }
    console.log('sent')
    break
  }
  case 'reload': {
    await page.send('Page.reload', { ignoreCache: true })
    console.log('reloaded')
    break
  }
  default:
    console.log('usage: node scripts/peek.mjs <shot [path] | eval <js> | reload>')
}

page.close()
