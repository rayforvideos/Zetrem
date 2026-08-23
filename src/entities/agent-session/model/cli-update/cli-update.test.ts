import { describe, expect, it } from 'vitest'
import { isOutdated, managerOf, updateCommand } from './cli-update'

describe('isOutdated', () => {
  it('is out of date behind a newer version', () => {
    expect(isOutdated('2.1.231', '2.1.240')).toBe(true)
    expect(isOutdated('2.1.231', '2.2.0')).toBe(true)
    expect(isOutdated('1.9.99', '2.0.0')).toBe(true)
  })

  it('is not out of date when level or ahead', () => {
    expect(isOutdated('2.1.231', '2.1.231')).toBe(false)
    expect(isOutdated('2.2.0', '2.1.240')).toBe(false)
  })

  it('compares numbers, where a string compare would answer backwards', () => {
    expect(isOutdated('2.1.99', '2.1.231')).toBe(true)
  })

  it('never calls it out of date on an unknown value', () => {
    expect(isOutdated(null, '2.1.240')).toBe(false)
    expect(isOutdated('2.1.231', null)).toBe(false)
    expect(isOutdated('알 수 없음', '2.1.240')).toBe(false)
  })
})

describe('managerOf', () => {
  it('works out who manages it from the path', () => {
    expect(managerOf('/opt/homebrew/Caskroom/claude/2.1.231/claude')).toBe('Homebrew')
    expect(managerOf('/Users/sam/project/node_modules/.bin/claude')).toBe('npm')
    expect(managerOf('/usr/local/bin/claude')).toBeNull()
  })

  it('reads a Windows path, where the separators lean the other way', () => {
    expect(
      managerOf('C:\\Users\\sam\\AppData\\Roaming\\npm\\node_modules\\@anthropic-ai\\claude-code\\cli.js'),
    ).toBe('npm')
  })
})

describe('updateCommand: who is allowed to do the updating', () => {
  it('hands a Homebrew install back to Homebrew, since claude update will not do it', () => {
    expect(updateCommand('Homebrew')).toBe('brew upgrade claude-code@latest')
  })

  it('lets the app do it when nothing else owns the install', () => {
    expect(updateCommand(null)).toBeNull()
    expect(updateCommand('npm')).toBeNull()
  })
})
