import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ClaudeMark } from './ClaudeMark'

describe('ClaudeMark: whose account these readings belong to', () => {
  it('draws one shape and nothing else, so it can sit inside a line of text', () => {
    const html = renderToStaticMarkup(<ClaudeMark />)
    expect(html.match(/<path/g)).toHaveLength(1)
    expect(html).toContain('viewBox="0 0 24 24"')
  })

  it('takes its colour from the text around it unless it is given one', () => {
    expect(renderToStaticMarkup(<ClaudeMark />)).toContain('fill="currentColor"')
  })

  it('sizes to the line it sits in rather than to a fixed box', () => {
    expect(renderToStaticMarkup(<ClaudeMark size={20} />)).toContain('width="20"')
  })

  it('stays out of the reading order, since the words beside it already say this', () => {
    expect(renderToStaticMarkup(<ClaudeMark />)).toContain('aria-hidden')
  })
})
