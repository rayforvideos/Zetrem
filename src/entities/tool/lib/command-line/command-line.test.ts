import { describe, expect, it } from 'vitest'
import { firstLineOf, heldCommand } from './command-line'

describe('firstLineOf: a command in the width of one row', () => {
  it('leaves a one-line command as it stands', () => {
    expect(firstLineOf('npm test')).toBe('npm test')
  })

  it('takes the first line of a script and marks that there is more', () => {
    expect(firstLineOf('set -e\nnpm run build\nnpm test')).toBe('set -e …')
  })

  it('drops the blank a heredoc opens with, rather than showing an empty row', () => {
    expect(firstLineOf('\n  npm test\n')).toBe('npm test')
  })

  it('keeps a long single line whole, since clipping it is the row layout job', () => {
    const long = `echo ${'x'.repeat(300)}`
    expect(firstLineOf(long)).toBe(long)
  })
})

describe('heldCommand: what an opened row shows above the output', () => {
  it('holds back a script, which is the whole reason to open the row', () => {
    expect(heldCommand('set -e\nnpm test')).toBe('set -e\nnpm test')
  })

  it('holds back a long line the row could only show the front of', () => {
    const long = `echo ${'x'.repeat(300)}`
    expect(heldCommand(long)).toBe(long)
  })

  it('says nothing when the row already showed the command whole', () => {
    expect(heldCommand('npm test')).toBeNull()
    expect(heldCommand('   ')).toBeNull()
  })
})
