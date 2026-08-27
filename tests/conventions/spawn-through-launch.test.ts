import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((one) => {
    const path = join(dir, one.name)
    if (one.isDirectory()) return sources(path)
    return path.endsWith('.ts') && !path.includes('.test.') ? [path] : []
  })
}

// Node refuses to spawn the .cmd that an npm install leaves on a Windows PATH,
// and a shell would strip the quotes out of the JSON we pass to --agents.
describe('the CLI is launched the one way that works on both platforms', () => {
  const files = sources('electron').filter((path) => !path.includes('spawn-claude'))

  it('spawns nothing without asking launchFor how to', () => {
    const raw: string[] = []
    for (const path of files) {
      const body = readFileSync(path, 'utf8')
      body.split('\n').forEach((line, at) => {
        const spawns = /(?<![a-zA-Z])spawn\(/.test(line)
        if (!spawns) return
        if (/spawn\(\s*[a-zA-Z]+\.command\b/.test(line)) return
        raw.push(`${path}:${at + 1} ${line.trim().slice(0, 70)}`)
      })
    }
    expect(raw, 'without launchFor, Windows cannot spawn a .cmd').toEqual([])
  })

  it('is a guard that fires on a spawn written the old way', () => {
    expect(/(?<![a-zA-Z])spawn\(/.test('const child = spawn(bin, args, { env })')).toBe(true)
    expect(/spawn\(\s*[a-zA-Z]+\.command\b/.test('spawn(launch.command, launch.args, {})')).toBe(
      true,
    )
  })
})
