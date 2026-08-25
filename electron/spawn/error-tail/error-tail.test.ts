import { describe, expect, it } from 'vitest'
import { ERROR_TAIL_MAX, errorTail } from './error-tail'

describe('errorTail: what stderr said, kept across chunks', () => {
  it('joins the pieces as they come', () => {
    expect(errorTail(errorTail('', 'could not '), 'start')).toBe('could not start')
  })

  it('keeps the earlier piece when a later one says nothing useful', () => {
    const held = errorTail('', 'Error: ENOENT claude\n')
    expect(errorTail(held, 'done\n')).toContain('ENOENT claude')
  })

  it('cuts from the front once it is too long', () => {
    expect(errorTail('x'.repeat(10), 'tail', 6)).toBe('xxtail')
  })

  it('holds nothing beyond the limit', () => {
    expect(errorTail('', 'y'.repeat(ERROR_TAIL_MAX + 500)).length).toBe(ERROR_TAIL_MAX)
  })

  it('leaves a short tail alone', () => {
    expect(errorTail('', 'short')).toBe('short')
  })
})
