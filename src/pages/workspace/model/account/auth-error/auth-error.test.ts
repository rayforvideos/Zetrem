import { describe, expect, it } from 'vitest'
import { errorAfterRefresh } from './auth-error'

describe('what a refresh of the account list does to the message on screen', () => {
  it('leaves a failure standing when the refresh is the one that follows the operation', () => {
    expect(errorAfterRefresh('Could not switch accounts.', 'follow-up')).toBe(
      'Could not switch accounts.',
    )
  })

  it('clears the message when the user asked to check again', () => {
    expect(errorAfterRefresh('Could not switch accounts.', 'asked')).toBeNull()
  })

  it('has nothing to keep when no message is showing', () => {
    expect(errorAfterRefresh(null, 'follow-up')).toBeNull()
  })
})
