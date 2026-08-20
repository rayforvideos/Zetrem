import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const DIR = join(process.cwd(), 'electron')

async function sources(): Promise<{ name: string; text: string }[]> {
  const names = (await readdir(DIR, { recursive: true })).filter(
    (name) => name.endsWith('.ts') && !name.endsWith('.test.ts'),
  )
  return Promise.all(
    names.map(async (name) => ({ name, text: await readFile(join(DIR, name), 'utf8') })),
  )
}

function channels(text: string, call: string): string[] {
  const found = [...text.matchAll(new RegExp(`${call}\\(\\s*'([^']+)'`, 'g'))]
  return found.map((match) => match[1] as string)
}

describe('the IPC bridge: a channel on one side only does nothing when pressed', () => {
  it('has the main process answer every channel the renderer calls', async () => {
    const files = await sources()
    const preload = files.find((file) => file.name === 'preload.ts')
    expect(preload).toBeDefined()

    const asked = [
      ...channels(preload?.text ?? '', 'ipcRenderer\\.invoke'),
      ...channels(preload?.text ?? '', 'ipcRenderer\\.send'),
    ]
    expect(asked.length).toBeGreaterThan(0)

    const served = files.flatMap((file) => [
      ...channels(file.text, '(?<![.\\\\w])handle'),
      ...channels(file.text, '(?<![.\\\\w])on'),
    ])

    const orphans = asked.filter((channel) => !served.includes(channel))
    expect(orphans, '메인이 받지 않는 채널').toEqual([])
  })

  it('lets the renderer reach every channel main answers, since a bridge nobody crosses is dead code', async () => {
    const files = await sources()
    const preload = files.find((file) => file.name === 'preload.ts')?.text ?? ''
    const asked = [
      ...channels(preload, 'ipcRenderer\\.invoke'),
      ...channels(preload, 'ipcRenderer\\.send'),
      ...channels(preload, 'ipcRenderer\\.on'),
    ]
    const served = files.flatMap((file) => [
      ...channels(file.text, '(?<![.\\\\w])handle'),
      ...channels(file.text, '(?<![.\\\\w])on'),
    ])
    const unreachable = served.filter((channel) => !asked.includes(channel))
    expect(unreachable, '렌더러가 부르지 않는 채널').toEqual([])
  })
})
