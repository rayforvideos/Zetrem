import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Wordmark } from './wordmark'

describe('Wordmark', () => {
  it('picks no colour of its own, and lives under the same rule as text', () => {
    const html = renderToStaticMarkup(<Wordmark width={180} />)
    expect(html).toContain('bg-current')
    expect(html).not.toMatch(/text-(red|amber|yellow|orange|blue|green)-/)
    expect(html).not.toContain('<img')
  })

  it('gets its ink shape from a mask', () => {
    const html = renderToStaticMarkup(<Wordmark width={180} />)
    expect(html).toContain('mask-image')
    expect(html).toContain('wordmark')
  })

  it('holds its aspect ratio, because stretched brushwork is different lettering', () => {
    const html = renderToStaticMarkup(<Wordmark width={720} />)
    expect(html).toContain('width:720px')
    expect(html).toContain('height:298px')
  })

  it('leaves a name a person can read, since a mask is nothing to a screen reader', () => {
    const html = renderToStaticMarkup(<Wordmark width={180} />)
    expect(html).toContain('Zetrem')
  })
})
