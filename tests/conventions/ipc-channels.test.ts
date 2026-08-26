import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ELECTRON = join(process.cwd(), 'electron')
const CONTRACT = join(process.cwd(), 'src', 'app', 'desk', 'desk.types.ts')

async function mainSources(): Promise<{ name: string; text: string }[]> {
  const names = (await readdir(ELECTRON, { recursive: true })).filter(
    (name) => name.endsWith('.ts') && !name.endsWith('.test.ts') && name !== 'preload.ts',
  )
  return Promise.all(
    names.map(async (name) => ({ name, text: await readFile(join(ELECTRON, name), 'utf8') })),
  )
}

// Channels named as the first argument of a call: handle('x', ...), invoke('x').
function named(text: string, call: string): string[] {
  const found = [...text.matchAll(new RegExp(`(?<![.\\w])${call}\\(\\s*'([^']+)'`, 'g'))]
  return found.map((match) => match[1] as string)
}

// Channels named as the second argument: push(target, 'x', payload).
function pushed(text: string): string[] {
  const found = [...text.matchAll(/(?<![.\w])push\(\s*[^,]+,\s*'([^']+)'/g)]
  return found.map((match) => match[1] as string)
}

// The keys of one exported map in the contract file.
function keysOf(text: string, map: string): string[] {
  const start = text.indexOf(`export type ${map} = {`)
  if (start === -1) return []
  const end = text.indexOf('\n}', start)
  const body = text.slice(start, end)
  return [...body.matchAll(/^\s*'([^']+)':/gm)].map((match) => match[1] as string)
}

const sorted = (list: string[]): string[] => [...new Set(list)].sort()

describe('the IPC bridge: one contract, and every side follows it', () => {
  it('has desk.types.ts name every channel, and nothing the app does not use', async () => {
    const contract = await readFile(CONTRACT, 'utf8')
    const preload = await readFile(join(ELECTRON, 'preload.ts'), 'utf8')

    const invokes = keysOf(contract, 'Invokes')
    const sends = keysOf(contract, 'Sends')
    const pushes = keysOf(contract, 'Pushes')
    expect(invokes.length).toBeGreaterThan(0)
    expect(sends.length).toBeGreaterThan(0)
    expect(pushes.length).toBeGreaterThan(0)

    // The preload wires each channel by the helper that matches its kind.
    expect(sorted(named(preload, 'invoke')), 'preload invoke() vs Invokes').toEqual(sorted(invokes))
    expect(sorted(named(preload, 'send')), 'preload send() vs Sends').toEqual(sorted(sends))
    expect(sorted(named(preload, 'listen')), 'preload listen() vs Pushes').toEqual(sorted(pushes))
  })

  it('has the main process answer every channel and push every event the contract names', async () => {
    const contract = await readFile(CONTRACT, 'utf8')
    const files = await mainSources()
    const handled = files.flatMap((file) => named(file.text, 'handle'))
    const heard = files.flatMap((file) => named(file.text, 'on'))
    const sent = files.flatMap((file) => pushed(file.text))

    expect(sorted(handled), 'main handle() vs Invokes').toEqual(sorted(keysOf(contract, 'Invokes')))
    expect(sorted(heard), 'main on() vs Sends').toEqual(sorted(keysOf(contract, 'Sends')))
    expect(sorted(sent), 'main push() vs Pushes').toEqual(sorted(keysOf(contract, 'Pushes')))
  })

  it('never reaches for ipcMain or webContents.send directly, since the typed wrappers are the bridge', async () => {
    const files = await mainSources()
    const stray = files
      .filter((file) => file.name !== join('ipc', 'ipc.ts'))
      .filter((file) => /ipcMain\.|webContents\.send\(|sender\.send\(/.test(file.text))
      .map((file) => file.name)
    expect(stray, 'go through handle/on/push in electron/ipc/ipc.ts').toEqual([])
  })
})
