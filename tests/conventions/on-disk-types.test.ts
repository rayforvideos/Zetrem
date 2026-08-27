import { readFile, readdir } from 'node:fs/promises'
import { join, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const MARK = '// On disk:'

// A file people already have is read by a later version, so these types cannot
// change the way the rest can. Adding a file to the disk means adding a line here.
const ON_DISK = [
  'src/entities/settings/model/settings/settings.types.ts',
  'src/entities/conversation/model/transcript/transcript.types.ts',
  'electron/projects/projects.types.ts',
  'electron/store/usage-cache/usage-cache.types.ts',
  'electron/store/project-memory/project-memory.ts',
]

const WRITERS: Record<string, string> = {
  'electron/store/settings-store/settings-store.ts': ON_DISK[0]!,
  'electron/store/transcript-store/transcript-store.ts': ON_DISK[1]!,
  'electron/projects/projects.ts': ON_DISK[2]!,
  'electron/projects/collapse/collapse.ts': ON_DISK[2]!,
  'electron/host/session-probe/session-probe.ts': ON_DISK[3]!,
  'electron/store/project-memory/project-memory.ts': ON_DISK[4]!,
  'electron/agents/agent-store/agent-store.ts': '',
}

// readdir hands back names with the platform's separator and the lists above are
// written with slashes. These paths are compared, never walked.
const slashed = (path: string): string => path.split(sep).join('/')

async function sources(dir: string): Promise<string[]> {
  const names = await readdir(join(ROOT, dir), { recursive: true })
  return names
    .filter((name) => /\.tsx?$/.test(name) && !name.includes('.test.'))
    .map((name) => `${dir}/${slashed(name)}`)
}

describe('what is written to disk is marked and listed', () => {
  it('marks every listed type, and lists every marked one', async () => {
    const marked: string[] = []
    for (const file of [...(await sources('src')), ...(await sources('electron'))]) {
      const text = await readFile(join(ROOT, file), 'utf8')
      if (text.includes(MARK)) marked.push(file)
    }
    expect(marked.sort(), `a type marked "${MARK}" belongs in ON_DISK`).toEqual([...ON_DISK].sort())
  })

  it('has every saveFile() caller named as a writer of a listed shape', async () => {
    const writers: string[] = []
    for (const file of await sources('electron')) {
      const text = await readFile(join(ROOT, file), 'utf8')
      if (file.endsWith('save-file/save-file.ts')) continue
      if (/(?<![.\w])saveFile\(/.test(text)) writers.push(file)
    }
    expect(writers.sort(), 'a module writing under userData is listed in WRITERS').toEqual(
      Object.keys(WRITERS).sort(),
    )
  })
})
