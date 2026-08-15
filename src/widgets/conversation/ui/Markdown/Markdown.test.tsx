import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Markdown } from './Markdown'

function draw(text: string): string {
  return renderToStaticMarkup(<Markdown text={text} />)
}

describe('Markdown: what agents write, as people read it', () => {
  it('leaves a Korean range alone, since a tilde there means from and to', () => {
    const html = draw('2025년 하반기~2026년 상반기 사이에 나왔습니다.')
    expect(html).not.toContain('<del>')
    expect(html).toContain('2025년 하반기~2026년 상반기')
  })

  it('does not strike through a whole paragraph because two ranges appeared in it', () => {
    const html = draw('올해 24일~30일 사이에 나왔고, 가격은 2026년~2027년에 정해집니다.')
    expect(html).not.toContain('<del>')
  })

  it('still strikes through when someone actually asked for it', () => {
    expect(draw('~~지워진 말~~')).toContain('<del>')
  })

  it('keeps the rest of the GitHub flavour, since only the single tilde was wrong', () => {
    expect(draw('| a | b |\n| --- | --- |\n| 1 | 2 |')).toContain('data-slot="table"')
  })
})
