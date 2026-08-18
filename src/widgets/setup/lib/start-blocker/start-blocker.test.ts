import { describe, expect, it } from 'vitest'
import { startBlocker } from './start-blocker'

describe('startBlocker: naming only what is actually missing', () => {
  it('says nothing once both are done', () => {
    expect(startBlocker(true, true)).toBe(null)
  })

  it('asks only for the project when the account is already in hand', () => {
    expect(startBlocker(true, false)?.message, '이미 한 일을 또 하라고 하지 않는다').toBe(
      'Choose a project folder',
    )
  })

  it('asks only for the account when the folder is already picked', () => {
    expect(startBlocker(false, true)?.message).toBe('Sign in to your Anthropic account')
  })

  it('asks for both when neither is done', () => {
    expect(startBlocker(false, false)?.message).toBe('Sign in and choose a project folder')
  })
})
