import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DiffLine } from '../../lib/diff/diff.types'
import { ChangeDiff } from './ChangeDiff'

function group(...texts: [DiffLine['kind'], string][]): DiffLine[] {
  return texts.map(([kind, text]) => ({ kind, text }))
}

describe('ChangeDiff: drawing the groups a diff view cuts out of a tool call', () => {
  it('draws nothing for no groups', () => {
    expect(renderToStaticMarkup(<ChangeDiff groups={[]} />)).toBe('')
  })

  it('draws one box per group, in order', () => {
    const html = renderToStaticMarkup(
      <ChangeDiff
        groups={[
          group(['remove', '첫째 옛것'], ['add', '첫째 새것']),
          group(['remove', '둘째 옛것'], ['add', '둘째 새것']),
        ]}
      />,
    )
    expect(html).toContain('첫째 옛것')
    expect(html).toContain('둘째 새것')
    expect(html.indexOf('첫째 새것')).toBeLessThan(html.indexOf('둘째 옛것'))
    expect(html).toContain('+')
    expect(html).toContain('−')
  })

  it('draws every line when there is no cap', () => {
    const lines = Array.from(
      { length: 500 },
      (_, i) => ['add', `줄${i}`] as [DiffLine['kind'], string],
    )
    const html = renderToStaticMarkup(<ChangeDiff groups={[group(...lines)]} />)
    expect(html).toContain('줄499')
    expect(html).not.toContain('data-more')
  })

  it('stops at the cap and shows a row for what was cut', () => {
    const lines = Array.from(
      { length: 460 },
      (_, i) => ['add', `줄${i}`] as [DiffLine['kind'], string],
    )
    const html = renderToStaticMarkup(<ChangeDiff groups={[group(...lines)]} maxLines={400} />)
    expect(html).toContain('줄399')
    expect(html).not.toContain('줄400<')
    expect(html).toContain('data-more')
    expect(html).toContain('60 more lines')
  })

  it('spends the cap across groups, not once per group', () => {
    const a = Array.from({ length: 300 }, (_, i) => ['add', `가${i}`] as [DiffLine['kind'], string])
    const b = Array.from({ length: 300 }, (_, i) => ['add', `나${i}`] as [DiffLine['kind'], string])
    const html = renderToStaticMarkup(
      <ChangeDiff groups={[group(...a), group(...b)]} maxLines={400} />,
    )
    expect(html).toContain('가299')
    expect(html).toContain('나99')
    expect(html).not.toContain('나100<')
    expect(html).toContain('data-more')
    expect(html).toContain('200 more lines')
  })
})
