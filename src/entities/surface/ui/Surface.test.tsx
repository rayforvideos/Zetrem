import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GROUND, TEXT } from '@/shared/config/theme'
import { Surface } from './Surface'

describe('Surface', () => {
  it('컴포넌트 언어가 읽는 색 변수를 판에 건다', () => {
    const html = renderToStaticMarkup(<Surface>내용</Surface>)
    expect(html).toContain(`--zt-text:${TEXT}`)
    expect(html).toContain(`--zt-on-primary:${GROUND}`)
  })

  it('유리는 없다 — 블러도 그라디언트도 그리지 않는다', () => {
    const html = renderToStaticMarkup(<Surface>내용</Surface>)
    expect(html).not.toContain('blur(')
    expect(html).not.toContain('backdrop')
    expect(html).not.toContain('data-scrim')
  })

  it('뒤층은 준 만큼만 그린다 — 안 주면 자리도 없다', () => {
    const withBehind = renderToStaticMarkup(<Surface behind={<span>텔레메트리</span>}>내용</Surface>)
    expect(withBehind).toContain('텔레메트리')
    expect(withBehind).toContain('data-behind')
    expect(renderToStaticMarkup(<Surface>내용</Surface>)).not.toContain('data-behind')
  })

  it('뒤층은 내용보다 뒤에 선다', () => {
    const html = renderToStaticMarkup(<Surface behind={<span>뒤</span>}>앞</Surface>)
    expect(html.indexOf('뒤')).toBeLessThan(html.indexOf('앞'))
  })
})
