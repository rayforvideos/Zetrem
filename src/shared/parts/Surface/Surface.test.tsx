import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Surface } from './Surface'

describe('Surface', () => {
  it('picks no colour of its own and reads the tokens at the root', () => {
    const html = renderToStaticMarkup(<Surface>내용</Surface>)
    expect(html).toContain('text-foreground')
    expect(html).toContain('bg-card')
    expect(html).not.toContain('--zt-text')
  })

  it('has no glass, and draws neither blur nor gradient', () => {
    const html = renderToStaticMarkup(<Surface>내용</Surface>)
    expect(html).not.toContain('blur(')
    expect(html).not.toContain('backdrop')
    expect(html).not.toContain('data-scrim')
  })

  it('owns its background instead of stacking a panel, which would bury what is behind', () => {
    const html = renderToStaticMarkup(<Surface>내용</Surface>)
    expect(html).not.toContain('absolute inset-0')
  })

  it('lays down nothing at all when bare', () => {
    const html = renderToStaticMarkup(<Surface bare>내용</Surface>)
    expect(html).not.toContain('bg-card')
    expect(html).not.toContain('border-border')
  })
})
