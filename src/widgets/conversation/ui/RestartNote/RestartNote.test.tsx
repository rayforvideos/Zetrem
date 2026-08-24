import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RestartNote } from './RestartNote'

describe('the note that waits instead of killing the session', () => {
  it('says what changed and offers the restart, in one place', () => {
    const html = renderToStaticMarkup(
      <RestartNote said="Model changed. The running session keeps its model." onRestart={() => {}} />,
    )
    expect(html).toContain('Model changed')
    expect(html).toContain('Restart session')
  })
})
