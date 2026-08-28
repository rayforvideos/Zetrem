import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import electron from 'electron'

const PORT = 9222
const PATIENCE_MS = 60_000
const WANT = /[A-Za-z가-힣]/

if (!existsSync('out/main/index.js')) {
  console.error('smoke: out/main/index.js is missing. Run npm run build first.')
  process.exit(1)
}

// A CI Linux box has no display of its own and no user namespaces for the
// sandbox; xvfb gives it the first, these flags excuse the rest.
const LINUX_FLAGS =
  process.platform === 'linux' ? ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] : []

const child = spawn(electron, ['.', `--remote-debugging-port=${PORT}`, ...LINUX_FLAGS], {
  env: { ...process.env, ZETREM_SMOKE: '1', ELECTRON_ENABLE_LOGGING: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let said = ''
child.stdout.setEncoding('utf8')
child.stderr.setEncoding('utf8')
child.stdout.on('data', (chunk) => (said += chunk))
child.stderr.on('data', (chunk) => (said += chunk))

let code = null
child.on('exit', (exit) => (code = exit))

function stop(status, why) {
  console.log(why)
  console.log(`--- app output (exit ${code}) ---\n${said.trim().slice(-3000) || '(nothing)'}`)
  try {
    child.kill('SIGKILL')
  } catch {
    // already gone
  }
  process.exit(status)
}

async function pageSocket() {
  const until = Date.now() + PATIENCE_MS
  while (Date.now() < until) {
    if (code !== null) stop(1, `smoke: the app exited on its own with code ${code}`)
    try {
      const pages = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((one) => one.json())
      const page = pages.find((one) => one.type === 'page' && one.webSocketDebuggerUrl)
      if (page) return page.webSocketDebuggerUrl
    } catch {
      // not listening yet
    }
    await new Promise((wake) => setTimeout(wake, 500))
  }
  stop(1, `smoke: no window appeared within ${PATIENCE_MS / 1000}s`)
}

const url = await pageSocket()
const socket = new WebSocket(url)
await new Promise((open, fail) => {
  socket.addEventListener('open', open, { once: true })
  socket.addEventListener('error', fail, { once: true })
})

function ask(id, method, params) {
  return new Promise((answer) => {
    const hear = (event) => {
      const message = JSON.parse(event.data)
      if (message.id !== id) return
      socket.removeEventListener('message', hear)
      answer(message.result)
    }
    socket.addEventListener('message', hear)
    socket.send(JSON.stringify({ id, method, params }))
  })
}

// One of the screens the app can open on. The crash screen (Boundary) also
// draws words, so words alone prove nothing.
const SCREENS = '[data-welcome], [data-setup-pane], [data-talk], [data-library-pane]'

const until = Date.now() + PATIENCE_MS
let seen = { text: '', screen: false, crashed: false }
let tick = 1
while (Date.now() < until) {
  const result = await ask(++tick, 'Runtime.evaluate', {
    expression: `JSON.stringify({
      text: document.body ? document.body.innerText : '',
      screen: document.querySelector(${JSON.stringify(SCREENS)}) !== null,
      crashed: document.querySelector('[data-crashed]') !== null,
    })`,
    returnByValue: true,
  })
  try {
    seen = JSON.parse(result?.result?.value ?? '{}')
  } catch {
    // not a page yet
  }
  if (seen.crashed || seen.screen) break
  await new Promise((wake) => setTimeout(wake, 500))
}

if (seen.crashed) stop(1, `smoke: the screen crashed:\n${seen.text.trim().slice(0, 1200)}`)
if (!seen.screen) stop(1, 'smoke: the window opened but never reached a screen')
if (/\[renderer\]/.test(said) && /error|crash|TypeError|ReferenceError/i.test(said)) {
  stop(1, 'smoke: the renderer logged an error while opening')
}
if (!WANT.test(seen.text)) stop(1, 'smoke: the screen has no words on it')
console.log(`smoke: the window is showing ${seen.text.trim().split('\n').length} lines`)
console.log(seen.text.trim().split('\n').slice(0, 12).join(' | ').slice(0, 400))
stop(0, 'smoke: ok')
