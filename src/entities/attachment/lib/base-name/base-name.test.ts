import { describe, expect, it } from 'vitest'
import { baseName } from './base-name'

describe('baseName: the last part of a path from either kind of machine', () => {
  it('reads a POSIX path', () => {
    expect(baseName('/Users/sam/work/basket.ts')).toBe('basket.ts')
  })

  it('reads a Windows path, which is where splitting on a slash went wrong', () => {
    expect(baseName('C:\\Users\\sam\\work\\basket.ts')).toBe('basket.ts')
  })

  it('reads a mixed path, which Node hands out on Windows', () => {
    expect(baseName('C:/Users/sam\\work/basket.ts')).toBe('basket.ts')
  })

  it('ignores a trailing separator, so a folder still has a name', () => {
    expect(baseName('C:\\Users\\sam\\work\\')).toBe('work')
    expect(baseName('/Users/sam/work/')).toBe('work')
  })

  it('gives back a bare name unchanged', () => {
    expect(baseName('basket.ts')).toBe('basket.ts')
  })

  it('gives back the whole thing when there is no part to take', () => {
    expect(baseName('')).toBe('')
  })
})
