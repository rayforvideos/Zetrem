import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AgentSession } from '@/entities/agent-session'
import { computeTint } from '@/entities/glass'
import { MOTION } from '@/shared/config/motion'
import { AgentTile } from './AgentTile'

const tint = computeTint({ min: 0.8, max: 0.8 }, 0.5)
const rect = { x: 48, y: 48, w: 600, h: 380 }

function session(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id: 'a',
    runnerId: 'fake',
    label: '가짜 에이전트',
    model: 'demo-1',
    status: 'working',
    headline: '타일을 만드는 중',
    stream: ['읽는 중 a.ts', '고치는 중 b.ts'],
    transcript: [],
    tokens: 1200,
    contextUsed: 0.3,
    startedAtMs: 0,
    ...overrides,
  }
}

describe('AgentTile', () => {
  it('세 층을 모두 그린다', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} tint={tint} rect={rect} delayMs={0} nowMs={5000} />,
    )
    expect(html).toContain('가짜 에이전트')
    expect(html).toContain('타일을 만드는 중')
    expect(html).toContain('고치는 중 b.ts')
    expect(html).toContain('토큰')
  })

  it('사각형을 좌표로 반영한다', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} tint={tint} rect={rect} delayMs={0} nowMs={0} />,
    )
    expect(html).toContain('600px')
    expect(html).toContain('380px')
  })

  it('스태거 지연을 스타일에 싣는다', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} tint={tint} rect={rect} delayMs={120} nowMs={0} />,
    )
    expect(html).toContain('120ms')
  })

  it('입력 대기 상태를 표시로 구분한다', () => {
    const waiting = renderToStaticMarkup(
      <AgentTile
        session={session({ status: 'waiting' })}
        tint={tint}
        rect={rect}
        delayMs={0}
        nowMs={0}
      />,
    )
    expect(waiting).toContain('data-status="waiting"')
  })

  it('시선의 주인일 때만 맥동한다 (스펙 §6)', () => {
    const owner = renderToStaticMarkup(
      <AgentTile
        session={session({ status: 'waiting' })}
        tint={tint}
        rect={rect}
        delayMs={0}
        nowMs={0}
        attention
      />,
    )
    expect(owner).toContain('data-pulse')
    expect(owner).toContain('tile-pulse')
    expect(owner).not.toContain('data-waiting')
  })

  it('주인이 아닌 대기 타일은 애니메이션 없이 상태만 낸다', () => {
    const quiet = renderToStaticMarkup(
      <AgentTile
        session={session({ status: 'waiting' })}
        tint={tint}
        rect={rect}
        delayMs={0}
        nowMs={0}
      />,
    )
    expect(quiet).toContain('data-waiting')
    expect(quiet).not.toContain('data-pulse')
    // 이 타일에는 어떤 애니메이션도 없어야 한다 — 작업 중 일렁임도 대상이 아니다
    expect(quiet).not.toContain('animation')
  })

  it('대기 표시는 currentColor 를 쓴다 — 밝은 유리 위에서도 보여야 한다', () => {
    const owner = renderToStaticMarkup(
      <AgentTile
        session={session({ status: 'waiting' })}
        tint={tint}
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
        tint={tint}
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
        tint={tint}
        rect={rect}
        delayMs={0}
        nowMs={0}
        attention
      />,
    )
    // 정체성(이름)은 남고 요약 문장만 물러난다
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
        tint={tint}
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
        tint={tint}
        rect={rect}
        delayMs={0}
        nowMs={0}
        attention
      />,
    )
    expect(html).toContain('data-transcript')
  })

  it('갈라지는 동안에만 경계 섬광을 그린다', () => {
    const sweeping = renderToStaticMarkup(
      <AgentTile session={session()} tint={tint} rect={rect} delayMs={0} nowMs={0} sweeping />,
    )
    expect(sweeping).toContain('data-sweep')

    const still = renderToStaticMarkup(
      <AgentTile session={session()} tint={tint} rect={rect} delayMs={0} nowMs={0} />,
    )
    expect(still).not.toContain('data-sweep')
  })

  it('3층은 유리 표면보다 먼저 그려진다 — 유리 뒤라는 것이 구조여야 한다', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} tint={tint} rect={rect} delayMs={0} nowMs={5000} />,
    )
    // 3층(토큰) → 블러 → 표면 순서. 표면 뒤에 오면 유리 앞에 뜬 데이터가 된다
    expect(html.indexOf('토큰')).toBeGreaterThan(-1)
    expect(html.indexOf('토큰')).toBeLessThan(html.indexOf('data-glass-surface'))
  })

  it('닫히는 타일은 흐려지며 병합 시간으로 움직인다', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} tint={tint} rect={rect} delayMs={0} nowMs={0} closing />,
    )
    expect(html).toContain('data-closing="true"')
    expect(html).toContain('opacity:0')
    expect(html).toContain(`transform ${MOTION.mergeMs}ms`)
    // 닫힘에도 경계 섬광이 붙는다 — 시작과 같은 문법으로 닫힌다 (스펙 §2.3)
    expect(html).toContain('data-sweep')
  })

  it('닫히지 않는 타일은 불투명하고 분할 시간으로 움직인다', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} tint={tint} rect={rect} delayMs={0} nowMs={0} />,
    )
    expect(html).not.toContain('data-closing')
    expect(html).toContain('opacity:1')
    expect(html).toContain(`transform ${MOTION.fanMs}ms`)
  })

  it('래퍼에 will-change 를 걸지 않는다 — opacity 힌트가 유리의 블러를 죽인다', () => {
    // will-change: opacity 는 이 래퍼를 backdrop root 로 만들고, 그러면 안쪽 유리가
    // 바깥을 샘플링하지 못해 배경이 흐려지지 않는다. 실측으로 확인한 회귀라 여기서 막는다.
    // (transform 은 무죄다 — 이 단정은 transform 을 금지하지 않는다)
    const html = renderToStaticMarkup(
      <AgentTile session={session()} tint={tint} rect={rect} delayMs={0} nowMs={0} />,
    )
    expect(html).not.toContain('will-change')
  })

  it('전환 중에는 2층을 멈춘다 — 움직임은 한 번에 하나만', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} tint={tint} rect={rect} delayMs={0} nowMs={0} sweeping />,
    )
    expect(html).not.toContain('고치는 중 b.ts')
  })
})
