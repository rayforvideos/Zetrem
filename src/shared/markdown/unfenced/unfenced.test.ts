import { describe, expect, it } from 'vitest'
import { unfenced } from './unfenced'

describe('unfenced: a whole answer wrapped in a markdown fence', () => {
  it('unwraps a report the model put in a markdown fence', () => {
    const said = '```markdown\n# Title\n\n## Part\ntext\n```'
    expect(unfenced(said)).toBe('# Title\n\n## Part\ntext')
  })

  it('takes md as the same thing', () => {
    expect(unfenced('```md\n# Title\n```')).toBe('# Title')
  })

  it('leaves a code block that is actually code alone', () => {
    const code = '```ts\nconst a = 1\n```'
    expect(unfenced(code)).toBe(code)
  })

  it('leaves a fence that is only part of the answer alone', () => {
    const said = 'Here it is:\n\n```markdown\n# Title\n```'
    expect(unfenced(said)).toBe(said)
  })

  it('leaves it alone when it holds fences of its own, since unwrapping would break them', () => {
    const nested = '```markdown\n# Title\n\n```ts\nconst a = 1\n```\n```'
    expect(unfenced(nested)).toBe(nested)
  })

  it('passes ordinary prose through untouched', () => {
    expect(unfenced('just words')).toBe('just words')
  })
})
