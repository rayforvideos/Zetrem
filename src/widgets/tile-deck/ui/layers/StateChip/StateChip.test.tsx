import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StateChip } from './StateChip'

describe('the tile writes a state down only when nothing else shows it', () => {
  it('says nothing while the agent is working, because the face is already bustling', () => {
    expect(renderToStaticMarkup(<StateChip status="working" />)).toBe('')
  })

  it('says nothing once the agent has reported or finished, because the face relaxes', () => {
    expect(renderToStaticMarkup(<StateChip status="reported" />)).toBe('')
    expect(renderToStaticMarkup(<StateChip status="done" />)).toBe('')
  })

  it('writes it down when only you can end it', () => {
    const html = renderToStaticMarkup(<StateChip status="waiting" />)
    expect(html).toContain('Needs you')
  })

  it('writes it in the voice of a sentence, not a badge', () => {
    const html = renderToStaticMarkup(<StateChip status="waiting" />)
    expect(html).not.toContain('uppercase')
    expect(html).not.toContain('letter-spacing')
  })
})

describe('a teammate working towards a run that has stopped for you', () => {
  it('says you are the one it is waiting on', () => {
    const html = renderToStaticMarkup(<StateChip status="working" held />)
    expect(html).toContain('Waiting on you')
    expect(html).toContain('data-held')
  })

  it('leaves the teammate itself as working, which is what it is doing', () => {
    expect(renderToStaticMarkup(<StateChip status="working" held />)).toContain(
      'data-state-chip="working"',
    )
  })

  it('says nothing extra about a teammate that has finished', () => {
    expect(renderToStaticMarkup(<StateChip status="done" held />)).toBe('')
  })
})
