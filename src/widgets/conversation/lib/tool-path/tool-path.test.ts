import { describe, expect, it } from 'vitest'
import type { ToolShape } from '@/entities/tool'
import { nearShape } from './tool-path'

const PROJECT = '/work/app'

function file(dir: string, name: string): ToolShape {
  return { kind: 'file', verb: 'read', dir, name }
}

describe('nearShape: a path the way the project speaks it', () => {
  it('drops the project root, which every row would otherwise repeat', () => {
    expect(nearShape(file('/work/app/src/ui/', 'Tick.tsx'), PROJECT)).toEqual(
      file('src/ui/', 'Tick.tsx'),
    )
  })

  it('leaves a file at the root with no folder in front of it', () => {
    expect(nearShape(file('/work/app/', 'package.json'), PROJECT)).toEqual(file('', 'package.json'))
  })

  it('keeps a path from outside the project whole, since out there the root is the news', () => {
    const away = file('/home/me/.claude/', 'settings.json')
    expect(nearShape(away, PROJECT)).toEqual(away)
  })

  it('leaves everything alone when there is no project to measure against', () => {
    const path = file('/work/app/src/', 'a.ts')
    expect(nearShape(path, null)).toEqual(path)
  })

  it('shortens where a search was run, which is a path like any other', () => {
    expect(nearShape({ kind: 'search', pattern: 'x', scope: '/work/app/src' }, PROJECT)).toEqual({
      kind: 'search',
      pattern: 'x',
      scope: 'src',
    })
  })

  it('has nothing to say about a command', () => {
    const ran: ToolShape = { kind: 'command', command: 'ls /work/app' }
    expect(nearShape(ran, PROJECT)).toEqual(ran)
  })
})
