import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Surface } from './Surface'

describe('Surface', () => {
  it('색을 스스로 정하지 않는다 — 문서 뿌리의 토큰을 읽는다', () => {
    const html = renderToStaticMarkup(<Surface>내용</Surface>)
    expect(html).toContain('text-foreground')
    expect(html).toContain('bg-card')
    expect(html).not.toContain('--zt-text')
  })

  it('유리는 없다 — 블러도 그라디언트도 그리지 않는다', () => {
    const html = renderToStaticMarkup(<Surface>내용</Surface>)
    expect(html).not.toContain('blur(')
    expect(html).not.toContain('backdrop')
    expect(html).not.toContain('data-scrim')
  })

  it('바탕은 겹판이 아니라 제 배경이다 — 위에 덮는 판이 있으면 뒤엣것이 묻힌다', () => {
    const html = renderToStaticMarkup(<Surface>내용</Surface>)
    expect(html).not.toContain('absolute inset-0')
  })

  it('bare 는 아무 판도 깔지 않는다', () => {
    const html = renderToStaticMarkup(<Surface bare>내용</Surface>)
    expect(html).not.toContain('bg-card')
    expect(html).not.toContain('border-border')
  })
})
