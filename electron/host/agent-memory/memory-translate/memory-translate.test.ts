import { describe, expect, it } from 'vitest'
import { promptFor, translateNote, translationOf } from './memory-translate'

const NOTE = { name: 'a', description: 'one line', kind: 'project', body: 'the fact\n' }

describe('promptFor', () => {
  it('names the language and carries both parts', () => {
    const prompt = promptFor(NOTE, 'ko')
    expect(prompt).toContain('into Korean')
    expect(prompt).toContain('"one line"')
    expect(prompt).toContain('the fact')
  })

  it('passes an unknown tongue through as it is', () => {
    expect(promptFor(NOTE, 'ja')).toContain('into ja')
  })
})

describe('translationOf', () => {
  it('reads the bare JSON answer', () => {
    expect(translationOf('{"description":"한 줄","body":"사실"}')).toEqual({
      description: '한 줄',
      body: '사실',
    })
  })

  it('takes a fenced answer too', () => {
    expect(translationOf('```json\n{"description":"한 줄","body":"사실"}\n```')).toEqual({
      description: '한 줄',
      body: '사실',
    })
  })

  it('answers null for anything else', () => {
    expect(translationOf('Sure! Here is the translation:')).toBeNull()
    expect(translationOf('{"description":"only half"}')).toBeNull()
  })
})

describe('translateNote', () => {
  it('hands back what the model translated', async () => {
    const got = await translateNote(NOTE, 'ko', () =>
      Promise.resolve('{"description":"한 줄","body":"사실"}'),
    )
    expect(got).toEqual({ ok: true, value: { description: '한 줄', body: '사실' } })
  })

  it('calls a broken answer garbled', async () => {
    const got = await translateNote(NOTE, 'ko', () => Promise.resolve('nope'))
    expect(got.ok).toBe(false)
  })

  it('calls a dead CLI cli', async () => {
    const got = await translateNote(NOTE, 'ko', () => Promise.reject(new Error('gone')))
    expect(got.ok).toBe(false)
  })
})
