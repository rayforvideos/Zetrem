import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CHROME_TOP, TRAFFIC_LIGHT } from '@/shared/config/theme'
import { TileDeck } from './TileDeck'

// 창틀을 OS 에 넘긴 뒤로 왼쪽 위 (18,18)~(80,50) 는 신호등의 자리다. 브라우저로 확인하면
// 신호등이 없어 겹침이 보이지 않는다 — 그래서 자리를 코드가 지킨다.
function deck(): string {
  return renderToStaticMarkup(
    <TileDeck
      state={{ kind: 'solo' }}
      sessions={[]}
      viewport={{ w: 1440, h: 900 }}
      nowMs={0}
      terminal={<div>내용</div>}
    />,
  )
}

describe('창틀 자리 — 신호등 위에 내용을 그리지 않는다', () => {
  it('한 장짜리 판은 신호등이 끝나는 아래에서 시작한다', () => {
    const html = deck()
    const at = html.indexOf('padding-top:')
    expect(at).toBeGreaterThan(-1)
    const value = Number(/padding-top:(\d+)px/.exec(html.slice(at))?.[1])
    expect(value).toBeGreaterThanOrEqual(TRAFFIC_LIGHT.y + TRAFFIC_LIGHT.size + 8)
  })

  it('비워 두는 높이는 신호등 자리에서 나온다 — 숫자를 따로 적어 두지 않는다', () => {
    expect(CHROME_TOP).toBeGreaterThanOrEqual(TRAFFIC_LIGHT.y + TRAFFIC_LIGHT.size)
  })
})
