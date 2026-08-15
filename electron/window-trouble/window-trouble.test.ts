import { describe, expect, it } from 'vitest'
import { loadTroubleLine, troublePage } from './window-trouble'

describe('loadTroubleLine', () => {
  it('says what the load failed with', () => {
    expect(loadTroubleLine(-6, 'ERR_FILE_NOT_FOUND')).toBe(
      'The window could not load: ERR_FILE_NOT_FOUND',
    )
  })

  it('stays quiet when the load was merely replaced', () => {
    expect(loadTroubleLine(-3, 'ERR_ABORTED')).toBeNull()
  })

  it('still says something when the description is empty', () => {
    expect(loadTroubleLine(-6, '   ')).toBe('The window could not load')
  })
})

describe('troublePage', () => {
  it('carries the reason into the page', () => {
    const page = decodeURIComponent(troublePage('ERR_FILE_NOT_FOUND'))
    expect(page).toContain('ERR_FILE_NOT_FOUND')
    expect(page.startsWith('data:text/html')).toBe(true)
  })

  it('does not let the reason become markup', () => {
    const page = decodeURIComponent(troublePage('<script>bad()</script>'))
    expect(page).not.toContain('<script>')
    expect(page).toContain('&lt;script&gt;')
  })
})
