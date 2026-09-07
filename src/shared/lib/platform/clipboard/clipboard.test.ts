import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText } from './clipboard'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('copyText: the one way text leaves for the clipboard', () => {
  it('hands the text over and says it landed', async () => {
    const writeText = vi.fn(async () => undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    expect(await copyText('a log line')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('a log line')
  })

  it('says it did not land rather than throwing at whoever asked', async () => {
    const writeText = vi.fn(async () => {
      throw new Error('not allowed')
    })
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    expect(await copyText('a log line')).toBe(false)
  })

  it('says no where there is no clipboard to write to at all', async () => {
    vi.stubGlobal('navigator', {})
    expect(await copyText('a log line')).toBe(false)
  })
})
