import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const DIR = join(process.cwd(), 'electron')

async function sources(): Promise<{ name: string; text: string }[]> {
  const names = (await readdir(DIR)).filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
  return Promise.all(
    names.map(async (name) => ({ name, text: await readFile(join(DIR, name), 'utf8') })),
  )
}

function channels(text: string, call: string): string[] {
  const found = [...text.matchAll(new RegExp(`${call}\\(\\s*'([^']+)'`, 'g'))]
  return found.map((match) => match[1] as string)
}

describe('IPC 다리 — 한쪽에만 있는 채널은 눌러도 아무 일이 없다', () => {
  it('렌더러가 부르는 채널은 모두 메인이 받는다', async () => {
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

  it('메인이 받는 채널은 렌더러가 닿을 수 있다 — 아무도 안 부르는 다리는 죽은 코드다', async () => {
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
