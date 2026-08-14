import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { MOTION } from '@/shared/config/motion/motion'
import { AgentTile } from './AgentTile'

const rect = { x: 48, y: 48, w: 600, h: 380 }

function session(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id: 'a',
    runnerId: 'fake',
    label: '가짜 에이전트',
    subagentType: 'general-purpose',
    model: 'demo-1',
    status: 'working',
    headline: '타일을 만드는 중',
    stream: ['Read a.ts', 'Edit b.ts'],
    transcript: [],
    tokens: 1200,
    contextUsed: 0.3,
    startedAtMs: 0,
    ...overrides,
  }
}

describe('AgentTile', () => {
  it('못 알아본 줄은 원문 그대로 남는다 — 모르는 줄일수록 버리면 안 된다', () => {
    const html = renderToStaticMarkup(
      <AgentTile
        session={session({ stream: ['무언가 이상한 줄 하나'] })}
        rect={rect}
        delayMs={0}
        nowMs={0}
      />,
    )
    expect(html).toContain('무언가 이상한 줄 하나')
  })

  it('한 일을 종류별로 세어 보여준다 — 얼마나 했는지가 보여야 한다', () => {
    const html = renderToStaticMarkup(
      <AgentTile
        session={session({ stream: ['Read a.ts', 'Read b.ts', 'Edit b.ts'] })}
        rect={rect}
        delayMs={0}
        nowMs={0}
      />,
    )
    const strip = html.slice(html.indexOf('data-tally'), html.indexOf('data-tally') + 1400)
    expect(strip).toContain('>2<')
    expect(strip).toContain('>1<')
  })

  it('세 층을 모두 그린다', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={5000} />,
    )
    expect(html).toContain('가짜 에이전트')
    expect(html).toContain('타일을 만드는 중')
    expect(html).toContain('b.ts')
    expect(html).toContain('Tokens')
  })

  it('사각형을 좌표로 반영한다', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={0} />,
    )
    expect(html).toContain('600px')
    expect(html).toContain('380px')
  })

  it('스태거 지연을 스타일에 싣는다', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={120} nowMs={0} />,
    )
    expect(html).toContain('120ms')
  })

  it('입력 대기 상태를 표시로 구분한다', () => {
    const waiting = renderToStaticMarkup(
      <AgentTile
        session={session({ status: 'waiting' })}

        rect={rect}
        delayMs={0}
        nowMs={0}
      />,
    )
    expect(waiting).toContain('data-status="waiting"')
  })

  it('시선의 주인은 테두리가 밝다 — 움직임이 아니라 밝기로 부른다 (스펙 §6)', () => {
    const owner = renderToStaticMarkup(
      <AgentTile
        session={session({ status: 'waiting' })}
        rect={rect}
        delayMs={0}
        nowMs={0}
        attention
      />,
    )
    const quiet = renderToStaticMarkup(
      <AgentTile session={session({ status: 'waiting' })} rect={rect} delayMs={0} nowMs={0} />,
    )
    expect(owner).toContain('data-waiting')
    expect(quiet).toContain('data-waiting')
    expect(owner).toContain('opacity:0.85')
    expect(quiet).toContain('opacity:0.25')
    expect(owner).not.toContain('animation')
  })

  it('대기 표시는 currentColor 를 쓴다 — 판이 밝아져도 보여야 한다', () => {
    const owner = renderToStaticMarkup(
      <AgentTile
        session={session({ status: 'waiting' })}

        rect={rect}
        delayMs={0}
        nowMs={0}
        attention
      />,
    )
    expect(owner).toContain('border:1px solid currentColor')
  })

  it('시선의 주인은 대화 전문을 펼친다 — 무슨 일을 하는지가 화면의 핵심이다', () => {
    const long = '어느 파일의 테스트를 고칠까요? '.repeat(20).trim()
    const html = renderToStaticMarkup(
      <AgentTile
        session={session({
          status: 'waiting',
          transcript: [
            { role: 'user', text: '테스트 고쳐줘' },
            { role: 'assistant', text: long },
          ],
        })}

        rect={rect}
        delayMs={0}
        nowMs={0}
        attention
      />,
    )
    expect(html).toContain('data-transcript')
    expect(html).toContain('테스트 고쳐줘')
    expect(html).toContain(long)
  })

  it('전문이 펼쳐지면 1층 요약은 물러난다 — 같은 말이 두 번 보이면 안 된다', () => {
    const html = renderToStaticMarkup(
      <AgentTile
        session={session({
          status: 'waiting',
          headline: '어느 테스트인가요?',
          transcript: [{ role: 'assistant', text: '어느 테스트인가요?' }],
        })}

        rect={rect}
        delayMs={0}
        nowMs={0}
        attention
      />,
    )
    expect(html).toContain('가짜 에이전트')
    expect(html.match(/어느 테스트인가요\?/g)).toHaveLength(1)
  })

  it('시선의 주인이 아니면 전문을 펼치지 않는다', () => {
    const html = renderToStaticMarkup(
      <AgentTile
        session={session({
          status: 'waiting',
          transcript: [{ role: 'user', text: '테스트 고쳐줘' }],
        })}

        rect={rect}
        delayMs={0}
        nowMs={0}
      />,
    )
    expect(html).not.toContain('data-transcript')
  })

  it('작업 중에도 시선의 주인이면 전문을 펼친다 — 관측기에는 답할 대기가 없다', () => {
    const html = renderToStaticMarkup(
      <AgentTile
        session={session({
          status: 'working',
          transcript: [{ role: 'user', text: '테스트 고쳐줘' }],
        })}

        rect={rect}
        delayMs={0}
        nowMs={0}
        attention
      />,
    )
    expect(html).toContain('data-transcript')
  })

  it('타일이 열릴 때 판 위에 무엇도 덧칠하지 않는다 — 자리로 오는 것이 전부다', () => {
    const sweeping = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={0} sweeping />,
    )
    expect(sweeping).not.toContain('linear-gradient')
    expect(sweeping).not.toContain('radial-gradient')
  })

  it('3층은 면보다 먼저 그려진다 — 데이터가 면 뒤에 깔린다는 것이 구조여야 한다', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={5000} />,
    )
    expect(html.indexOf('Tokens')).toBeGreaterThan(-1)
    expect(html.indexOf('Tokens')).toBeLessThan(html.indexOf('data-surface'))
  })

  it('닫히는 타일은 흐려지며 병합 시간으로 움직인다', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={0} closing />,
    )
    expect(html).toContain('data-closing="true"')
    expect(html).toContain('opacity:0')
    expect(html).toContain(`transform ${MOTION.mergeMs}ms`)
  })

  it('닫히지 않는 타일은 불투명하고 분할 시간으로 움직인다', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={0} />,
    )
    expect(html).not.toContain('data-closing')
    expect(html).toContain('opacity:1')
    expect(html).toContain(`transform ${MOTION.fanMs}ms`)
  })

  it('래퍼에 will-change 를 걸지 않는다 — 없는 합성 층을 미리 만들지 않는다', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={0} />,
    )
    expect(html).not.toContain('will-change')
  })

  it('전환 중에는 2층을 멈춘다 — 움직임은 한 번에 하나만', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={0} sweeping />,
    )
    expect(html).not.toContain('고치는 중 b.ts')
  })
})
