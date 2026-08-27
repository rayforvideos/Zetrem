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

const child = spawn(electron, ['.', `--remote-debugging-port=${PORT}`], {
  env: { ...process.env, ZETREM_SMOKE: '1' },
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
  if (said.trim().length > 0) console.log(`--- app output ---\n${said.trim().slice(-2000)}`)
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

const until = Date.now() + PATIENCE_MS
let text = ''
while (Date.now() < until) {
  const result = await ask(1, 'Runtime.evaluate', {
    expression: 'document.body ? document.body.innerText : ""',
    returnByValue: true,
  })
  text = result?.result?.value ?? ''
  if (WANT.test(text)) break
  await new Promise((wake) => setTimeout(wake, 500))
}

if (!WANT.test(text)) stop(1, 'smoke: the window opened but drew no words')
console.log(`smoke: the window is showing ${text.trim().split('\n').length} lines`)
console.log(text.trim().split('\n').slice(0, 12).join(' | ').slice(0, 400))
stop(0, 'smoke: ok')
