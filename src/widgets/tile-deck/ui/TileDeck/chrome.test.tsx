import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CHROME_TOP, TRAFFIC_LIGHT } from '@/shared/config/theme'
import { TileDeck } from './TileDeck'

function deck(): string {
  return renderToStaticMarkup(
    <TileDeck
      state={{ kind: 'solo' }}
      sessions={[]}
      face="onigiri"
      name="Ray"
      viewport={{ w: 1440, h: 900 }}
      nowMs={0}
      terminal={<div>내용</div>}
    />,
  )
}

describe('window chrome: nothing is drawn over the traffic lights', () => {
  it('starts the single board below where the traffic lights end', () => {
    const html = deck()
    const at = html.indexOf('padding-top:')
    expect(at).toBeGreaterThan(-1)
    const value = Number(/padding-top:(\d+)px/.exec(html.slice(at))?.[1])
    expect(value).toBeGreaterThanOrEqual(TRAFFIC_LIGHT.y + TRAFFIC_LIGHT.size + 8)
  })

  it('derives the height it leaves clear from the traffic lights, rather than a written number', () => {
    expect(CHROME_TOP).toBeGreaterThanOrEqual(TRAFFIC_LIGHT.y + TRAFFIC_LIGHT.size)
  })
})
