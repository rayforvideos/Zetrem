import { describe, expect, it } from 'vitest'
import { reasonOf } from './failure'

describe('the reason a thing failed has to be readable', () => {
  it('takes off the remote method prefix Electron adds', () => {
    const cause = new Error("Error invoking remote method 'auth:logout': claude: not found")
    expect(reasonOf(cause)).toBe('claude: not found')
  })

  it('turns anything thrown into words, so it can be shown', () => {
    expect(reasonOf('plain string')).toBe('plain string')
    expect(reasonOf(404)).toBe('404')
  })

  it('leaves an ordinary error as it is', () => {
    expect(reasonOf(new Error('disk full'))).toBe('disk full')
  })
})
