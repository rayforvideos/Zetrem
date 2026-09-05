import { describe, expect, it } from 'vitest'
import { isEnvName } from './env-name'

describe('isEnvName: what may be named as a variable to carry through', () => {
  it('takes the shape every shell writes', () => {
    for (const name of ['GITHUB_TOKEN', 'A', 'X9', 'MY_VAR_2']) {
      expect(isEnvName(name), name).toBe(true)
    }
  })

  it('refuses anything that is not a bare upper-case name', () => {
    for (const name of ['', 'lower', '9LEAD', 'HAS SPACE', 'HAS-DASH', 'A=B', 'A;rm -rf /']) {
      expect(isEnvName(name), name).toBe(false)
    }
  })

  it('refuses what is not a string at all, because the list comes off a file', () => {
    for (const value of [null, undefined, 7, {}, ['A']]) {
      expect(isEnvName(value)).toBe(false)
    }
  })
})
