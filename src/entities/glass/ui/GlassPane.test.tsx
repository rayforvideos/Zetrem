import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MOTION } from '@/shared/config/motion'
import { GLASS_BLUR_PX, computeTint } from '../model/tint'
import { GlassPane } from './GlassPane'

function count(html: string, needle: string): number {
  return html.split(needle).length - 1
}

describe('GlassPane', () => {
  it('틴트의 표면 색과 블러를 스타일로 반영한다', () => {
    const tint = computeTint({ min: 0.9, max: 0.9 }, 0.5)
    const html = renderToStaticMarkup(<GlassPane tint={tint}>내용</GlassPane>)
    expect(html).toContain(`blur(${GLASS_BLUR_PX}px)`)
    expect(html).toContain('내용')
  })

  it('스크림이 필요 없으면 스크림 레이어를 그리지 않는다', () => {
    const tint = { ...computeTint({ min: 0.5, max: 0.5 }, 1), scrimAlpha: 0 }
    const html = renderToStaticMarkup(<GlassPane tint={tint}>내용</GlassPane>)
    expect(html).not.toContain('data-scrim')
  })

  it('스크림이 필요하면 스크림 레이어를 그린다', () => {
    const tint = { ...computeTint({ min: 0.5, max: 0.5 }, 1), scrimAlpha: 0.4 }
    const html = renderToStaticMarkup(<GlassPane tint={tint}>내용</GlassPane>)
    expect(html).toContain('data-scrim')
  })

  it('behind 는 블러 위, 표면 아래에 그려진다 — 흐려지지 않되 유리 뒤여야 한다 (스펙 §5.3)', () => {
    const tint = computeTint({ min: 0.5, max: 0.5 }, 0.5)
    const html = renderToStaticMarkup(
      <GlassPane tint={tint} behind={<span>텔레메트리</span>}>
        내용
      </GlassPane>,
    )
    // 블러보다 뒤에 그려야 backdrop-filter 가 3층을 샘플링하지 않는다 — 15px 숫자는 24px 블러를 못 견딘다
    expect(html.indexOf('텔레메트리')).toBeGreaterThan(html.indexOf('backdrop-filter'))
    // 표면보다는 앞 — 표면 틴트가 덮어야 "유리 뒤" 성질(감쇠)이 유지된다
    expect(html.indexOf('텔레메트리')).toBeLessThan(html.indexOf('data-glass-surface'))
    // 1층은 표면보다 뒤 — 유리 위에 얹힌다
    expect(html.indexOf('내용')).toBeGreaterThan(html.indexOf('data-glass-surface'))
  })

  it('3층 밝기를 유리가 걸어 준다 — 내용이 자기 밝기를 정하지 않는다 (스펙 §5.3)', () => {
    const tint = computeTint({ min: 0.5, max: 0.5 }, 0.5)
    const html = renderToStaticMarkup(
      <GlassPane tint={tint} behind={<span>텔레메트리</span>}>
        내용
      </GlassPane>,
    )
    expect(html).toContain(`opacity:${tint.behindOpacity}`)
  })

  it('behind 를 주지 않으면 그 층을 만들지 않는다', () => {
    const tint = computeTint({ min: 0.5, max: 0.5 }, 0.5)
    const bare = renderToStaticMarkup(<GlassPane tint={tint}>내용</GlassPane>)
    const withBehind = renderToStaticMarkup(
      <GlassPane tint={tint} behind={<i />}>
        내용
      </GlassPane>,
    )
    // 빈 레이어를 하나 더 그리면 타일마다 합성 대상이 하나씩 늘어난다
    expect(count(bare, '<div')).toBe(count(withBehind, '<div') - 1)
  })

  it('틴트는 건너간다 — 배경 밝기를 따라갈 때 색이 튀지 않아야 한다 (스펙 §4.1)', () => {
    const html = renderToStaticMarkup(<GlassPane tint={computeTint({ min: 0.5, max: 0.5 }, 0.5)}>내용</GlassPane>)
    expect(html).toContain(`color ${MOTION.tintMs}ms`)
    expect(html).toContain(`background-color ${MOTION.tintMs}ms`)
  })
})
