import { describe, expect, it } from 'vitest'
import { canAddEnv, tidyEnvName } from './env-list'

describe('tidyEnvName', () => {
  it('folds a name typed in lower case, which is how people type it', () => {
    expect(tidyEnvName('github_token')).toBe('GITHUB_TOKEN')
  })

  it('trims a name pasted out of a terminal', () => {
    expect(tidyEnvName('  GITHUB_TOKEN \n')).toBe('GITHUB_TOKEN')
  })
})

describe('canAddEnv', () => {
  it('takes a bare name that is not on the list yet', () => {
    expect(canAddEnv([], 'GITHUB_TOKEN')).toBe(true)
    expect(canAddEnv(['FIGMA_PAT'], 'GITHUB_TOKEN')).toBe(true)
  })

  it('refuses a name already on the list, so nothing is said twice', () => {
    expect(canAddEnv(['GITHUB_TOKEN'], 'GITHUB_TOKEN')).toBe(false)
  })

  it('refuses what is not a name, rather than saving it to be dropped later', () => {
    for (const typed of ['', 'A=B', 'HAS SPACE', '9LEAD', 'A;rm -rf /']) {
      expect(canAddEnv([], typed), typed).toBe(false)
    }
  })
})
