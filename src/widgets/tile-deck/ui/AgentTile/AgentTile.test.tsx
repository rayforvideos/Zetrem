import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AgentSession, Call } from '@/entities/agent-session'
import { MOTION } from '@/shared/config/motion/motion'
import { AgentTile } from './AgentTile'

const rect = { x: 48, y: 48, w: 600, h: 380 }

function call(id: string, line: string): Call {
  return { id, line, startedAtMs: 0, endedAtMs: 200, failed: false, note: '' }
}

function session(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id: 'a',
    runnerId: 'fake',
    label: '가짜 에이전트',
    subagentType: 'general-purpose',
    model: 'demo-1',
    status: 'working',
    headline: '타일을 만드는 중',
    stream: [call('c1', 'Read a.ts'), call('c2', 'Edit b.ts')],
    transcript: [],
    tokens: 1200,
    contextUsed: 0.3,
    startedAtMs: 0,
    ...overrides,
  }
}

describe('AgentTile', () => {
  it('keeps a line it could not read exactly as it came', () => {
    const html = renderToStaticMarkup(
      <AgentTile
        session={session({ stream: [call('c1', '무언가 이상한 줄 하나')] })}
        rect={rect}
        delayMs={0}
        nowMs={0}
      />,
    )
    expect(html).toContain('무언가 이상한 줄 하나')
  })

  it('writes down only the state that nothing else on the tile can show', () => {
    const working = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={0} />,
    )
    const waiting = renderToStaticMarkup(
      <AgentTile session={session({ status: 'waiting' })} rect={rect} delayMs={0} nowMs={0} />,
    )
    expect(working).not.toContain('Working')
    expect(working).toContain('zt-sprite--busy')
    expect(waiting).toContain('Needs you')
  })

  it('draws all three layers', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={5000} />,
    )
    expect(html).toContain('가짜 에이전트')
    expect(html).toContain('타일을 만드는 중')
    expect(html).toContain('b.ts')
    expect(html).toContain('tokens')
  })

  it('puts the tile where the rectangle says', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={0} />,
    )
    expect(html).toContain('600px')
    expect(html).toContain('380px')
  })

  it('carries the stagger delay in the style', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={120} nowMs={0} />,
    )
    expect(html).toContain('120ms')
  })

  it('marks a tile that is waiting on you', () => {
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

  it('brightens the border of the tile that has the eye, calling with light and not motion', () => {
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
    const mark = owner.slice(owner.indexOf('data-waiting'), owner.indexOf('data-waiting') + 260)
    expect(mark, 'waiting calls with light, not with movement').not.toContain('animation')
  })

  it('draws the waiting mark in the current colour, so it survives a lighter board', () => {
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

  it('opens the transcript on the tile that has the eye', () => {
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

  it('drops the headline when the transcript opens, so nothing is said twice', () => {
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

  it('keeps the conversation on every tile, not only the one with the eye', () => {
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
    expect(html).toContain('data-transcript')
    expect(html).toContain('테스트 고쳐줘')
  })

  it('falls back to the headline only while there is nothing said yet', () => {
    const html = renderToStaticMarkup(
      <AgentTile
        session={session({ headline: '아직 아무 말도 없음', transcript: [] })}
        rect={rect}
        delayMs={0}
        nowMs={0}
      />,
    )
    expect(html).not.toContain('data-transcript')
    expect(html).toContain('아직 아무 말도 없음')
  })

  it('keeps every turn, so nothing an agent said is swapped out by the next', () => {
    const html = renderToStaticMarkup(
      <AgentTile
        session={session({
          transcript: [
            { role: 'user', text: '리서치해줘' },
            { role: 'assistant', text: '첫 번째로 찾은 것' },
            { role: 'assistant', text: '두 번째로 찾은 것' },
          ],
        })}
        rect={rect}
        delayMs={0}
        nowMs={0}
      />,
    )
    expect(html).toContain('리서치해줘')
    expect(html).toContain('첫 번째로 찾은 것')
    expect(html).toContain('두 번째로 찾은 것')
  })

  it('opens the transcript for the tile with the eye even while it works', () => {
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

  it('paints nothing over the board as a tile opens; arriving is the whole effect', () => {
    const sweeping = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={0} sweeping />,
    )
    expect(sweeping).not.toContain('linear-gradient')
    expect(sweeping).not.toContain('radial-gradient')
  })

  it('puts the gauge last, at the foot of the tile, as a base under the stream', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={5000} />,
    )
    expect(html.indexOf('data-gauge')).toBeGreaterThan(html.indexOf('data-stream'))
  })

  it('actually shows the gauge, rather than drawing it behind a panel', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={5000} />,
    )
    expect(html).toContain('data-gauge')
    expect(html).not.toContain('data-behind')
  })

  it('fades a closing tile and moves it on the merge timing', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={0} closing />,
    )
    expect(html).toContain('data-closing="true"')
    expect(html).toContain('opacity:0')
    expect(html).toContain(`transform ${MOTION.mergeMs}ms`)
  })

  it('keeps an open tile solid and moves it on the fan timing', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={0} />,
    )
    expect(html).not.toContain('data-closing')
    expect(html).toContain('opacity:1')
    expect(html).toContain(`transform ${MOTION.fanMs}ms`)
  })

  it('sets no will-change, so no compositing layer is kept once the tile has settled', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={0} />,
    )
    expect(html).not.toContain('will-change')
  })

  it('arrives under its own animation rather than appearing already there', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={0} />,
    )
    expect(html).toContain('data-presence="arriving"')
    expect(html).toContain('zt-tile-in')
  })

  it('leaves faster than it arrives, the way a thing put away does', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={0} closing />,
    )
    expect(html).toContain('data-presence="leaving"')
    expect(html).toContain('zt-tile-out')
    expect(MOTION.leaveMs).toBeLessThan(MOTION.arriveMs)
  })

  it('keeps where it sits and whether it is here on separate layers, so neither fights the other', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={0} />,
    )
    const box = html.slice(0, html.indexOf('data-presence'))
    expect(box, 'the outer box only holds the place').toContain('transition')
    expect(box).not.toContain('animation')
  })

  it('holds the stream still during a transition, so only one thing moves at a time', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={0} sweeping />,
    )
    expect(html).not.toContain('고치는 중 b.ts')
  })
})
