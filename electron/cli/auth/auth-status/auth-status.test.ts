import { describe, expect, it } from 'vitest'
import { authFailureOf, authStatusOf } from './auth-status'

describe('reading claude auth status', () => {
  it('reads the pretty-printed JSON the CLI actually prints', () => {
    const out = '{\n  "loggedIn": true,\n  "email": "a@b.co",\n  "orgName": "Acme"\n}\n'
    expect(authStatusOf(out)).toEqual({ state: 'signed-in', email: 'a@b.co', orgName: 'Acme' })
  })

  it('skips a warning printed before the JSON', () => {
    const out = 'Warning: update available\n{"loggedIn": false}\n'
    expect(authStatusOf(out)).toEqual({ state: 'signed-out' })
  })

  it('does not call anyone signed out when there is no JSON at all', () => {
    expect(authStatusOf('something went wrong')).toEqual({
      state: 'unreachable',
      said: 'claude auth status gave no JSON',
    })
  })

  it('reads signed out from a non-zero exit that still printed its JSON', () => {
    expect(authFailureOf({ code: 1, stdout: '{\n  "loggedIn": false\n}\n' })).toEqual({
      state: 'signed-out',
    })
  })

  it('tells a missing binary from a hang from a failed run', () => {
    expect(authFailureOf({ code: 'ENOENT' })).toEqual({ state: 'cli-missing' })
    expect(authFailureOf({ killed: true })).toEqual({
      state: 'unreachable',
      said: 'claude auth status did not answer in time',
    })
    expect(authFailureOf({ code: 1, stderr: 'boom\n' })).toEqual({
      state: 'unreachable',
      said: 'boom',
    })
  })
})
