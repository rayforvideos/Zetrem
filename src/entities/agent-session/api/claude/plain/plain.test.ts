import { describe, expect, it } from 'vitest'
import { plainTrouble } from './plain'

describe('plainTrouble', () => {
  it('keeps a plain complaint the CLI printed instead of JSON', () => {
    expect(plainTrouble('Error: could not reach the API')).toBe('Error: could not reach the API')
  })

  it('ignores ordinary chatter', () => {
    expect(plainTrouble('Loading plugins')).toBeNull()
  })

  it('ignores an empty line', () => {
    expect(plainTrouble('   ')).toBeNull()
  })

  it('leaves broken JSON alone rather than reading it aloud', () => {
    expect(plainTrouble('{"type":"result","is_er')).toBeNull()
  })

  it('strips terminal colouring', () => {
    expect(plainTrouble('[31mfatal: no such file[0m')).toBe('fatal: no such file')
  })

  it('cuts a run-on line short', () => {
    const said = plainTrouble(`error ${'x'.repeat(400)}`)
    expect(said).toHaveLength(303)
    expect(said?.endsWith('...')).toBe(true)
  })
})
