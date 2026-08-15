import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BrandMark, brandTile } from './BrandMark'
import { BRAND_MARKS } from './marks'

describe('BrandMark: the badge of the service a connector reaches', () => {
  it('draws the mark it was asked for', () => {
    const html = renderToStaticMarkup(<BrandMark brand="figma" />)
    expect(html).toContain('data-brand="figma"')
    expect(html.match(/<path/g)).toHaveLength(1)
  })

  it('draws nothing at all for a service it has no mark for', () => {
    expect(renderToStaticMarkup(<BrandMark brand="nobody" />)).toBe('')
    expect(renderToStaticMarkup(<BrandMark brand={null} />)).toBe('')
  })

  it('wears the brand colour rather than the colour of the row', () => {
    expect(brandTile('gmail')?.bg).toBe('#EA4335')
    expect(renderToStaticMarkup(<BrandMark brand="gmail" />)).not.toContain('currentColor')
  })

  it('turns a brand that is nearly black inside out, so it is not lost on a dark board', () => {
    expect(brandTile('notion')?.bg).toBe('#ffffff')
    expect(renderToStaticMarkup(<BrandMark brand="notion" />)).toContain('fill="#000000"')
  })

  it('has a colour on file for every mark it carries', () => {
    for (const [slug, mark] of Object.entries(BRAND_MARKS)) {
      expect(mark.hex, slug).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(mark.path.length, slug).toBeGreaterThan(20)
    }
  })

  it('stays out of the reading order, since the name is written beside it', () => {
    expect(renderToStaticMarkup(<BrandMark brand="asana" />)).toContain('aria-hidden')
  })
})
