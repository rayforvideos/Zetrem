import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Wordmark } from './wordmark'

describe('Wordmark', () => {
  it('색을 스스로 정하지 않는다 — 글자와 같은 규칙 아래 있다', () => {
    const html = renderToStaticMarkup(<Wordmark width={180} />)
    // 잉크는 currentColor 다. 이미지가 자기 색을 들고 오면 배경 위에서 규칙이 깨진다
    expect(html).toContain('bg-current')
    expect(html).not.toMatch(/text-(red|amber|yellow|orange|blue|green)-/)
    expect(html).not.toContain('<img')
  })

  it('마스크로 잉크 모양을 얻는다', () => {
    const html = renderToStaticMarkup(<Wordmark width={180} />)
    expect(html).toContain('mask-image')
    expect(html).toContain('wordmark')
  })

  it('원본 비율을 지킨다 — 붓글씨는 늘어나면 다른 글씨가 된다', () => {
    const html = renderToStaticMarkup(<Wordmark width={720} />)
    // 자산은 720x298 이다
    expect(html).toContain('width:720px')
    expect(html).toContain('height:298px')
  })

  it('사람이 읽는 이름을 남긴다 — 마스크는 스크린리더에 아무것도 아니다', () => {
    const html = renderToStaticMarkup(<Wordmark width={180} />)
    expect(html).toContain('Zetrem')
  })
})
