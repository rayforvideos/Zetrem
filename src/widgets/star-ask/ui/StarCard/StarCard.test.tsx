import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StarCard } from './StarCard'

describe('StarCard: the star character asks for a star', () => {
  it('shows the character, the ask, and the two answers', () => {
    const out = renderToStaticMarkup(<StarCard onStar={() => {}} onLater={() => {}} />)
    expect(out).toContain('data-star-card')
    expect(out).toMatch(/<img[^>]*star_relax/)
    expect(out).toContain('Is Zetrem earning its keep?')
    expect(out).toContain('Star it')
    expect(out).toContain('Not now')
  })
})
