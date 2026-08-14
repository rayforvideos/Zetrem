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
  it('keeps a line it could not read exactly as it came', () => {
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

  it('writes the state in words and not just a dot, because colour alone says nothing', () => {
    const working = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={0} />,
    )
    const waiting = renderToStaticMarkup(
      <AgentTile session={session({ status: 'waiting' })} rect={rect} delayMs={0} nowMs={0} />,
    )
    expect(working).toContain('Working')
    expect(waiting).toContain('Needs you')
  })

  it('draws all three layers', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={5000} />,
    )
    expect(html).toContain('가짜 에이전트')
    expect(html).toContain('타일을 만드는 중')
    expect(html).toContain('b.ts')
    expect(html).toContain('Tokens')
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
    expect(owner).not.toContain('animation')
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

  it('leaves the transcript closed on every other tile', () => {
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

  it('sets no will-change, so no compositing layer is made in advance', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={0} />,
    )
    expect(html).not.toContain('will-change')
  })

  it('holds the stream still during a transition, so only one thing moves at a time', () => {
    const html = renderToStaticMarkup(
      <AgentTile session={session()} rect={rect} delayMs={0} nowMs={0} sweeping />,
    )
    expect(html).not.toContain('고치는 중 b.ts')
  })
})
