import { describe, expect, it } from 'vitest'
import { resultText, toolLine, withoutCd } from './shared'

describe('a tool line spends its width on what happened', () => {
  it('drops the walk to the project that precedes the real command', () => {
    expect(withoutCd('cd /Users/me/work/app; npm test')).toBe('npm test')
    expect(withoutCd('cd /Users/me/work/app && npm test')).toBe('npm test')
    expect(withoutCd("cd '/Users/me/my app'; ls")).toBe('ls')
  })

  it('leaves a command that is only a cd, since that is what it did', () => {
    expect(withoutCd('cd /Users/me/work/app')).toBe('cd /Users/me/work/app')
  })

  it('keeps a walk into a folder of the project, which says where it ran', () => {
    expect(withoutCd('cd packages/ui && pnpm build')).toBe('cd packages/ui && pnpm build')
  })

  it('leaves anything else alone', () => {
    expect(withoutCd('git status')).toBe('git status')
    expect(withoutCd('echo "cd /tmp; ls"')).toBe('echo "cd /tmp; ls"')
  })

  it('shows in the line the app draws', () => {
    expect(toolLine('Bash', { command: 'cd /Users/me/work/app; git log --oneline -3' })).toBe(
      'Bash git log --oneline -3',
    )
  })
})

describe('resultText', () => {
  it('skips a null block rather than throwing on it', () => {
    expect(resultText([null, { type: 'text', text: 'said' }])).toBe('said')
  })
})
