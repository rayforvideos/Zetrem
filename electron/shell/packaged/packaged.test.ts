import { describe, expect, it } from 'vitest'
import { loadedFromAsar } from './packaged'

describe('a packaged run is one loaded from an asar', () => {
  it('sees the archive electron-builder writes', () => {
    expect(loadedFromAsar('/Applications/Zetrem.app/Contents/Resources/app.asar')).toBe(true)
    expect(
      loadedFromAsar('C:\\Users\\r\\AppData\\Local\\Programs\\Zetrem\\resources\\app.asar'),
    ).toBe(true)
  })

  it('does not see one in a checkout, whatever the binary is called', () => {
    expect(loadedFromAsar('/Users/r/workspace/Zetrem')).toBe(false)
    expect(loadedFromAsar('/Users/r/workspace/Zetrem/out/main')).toBe(false)
  })

  it('is not fooled by a folder that merely mentions asar', () => {
    expect(loadedFromAsar('/Users/r/asar-notes/Zetrem')).toBe(false)
  })
})
