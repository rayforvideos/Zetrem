import { describe, expect, it } from 'vitest'
import { fromResult } from './turn'

describe('a result that names a model the account cannot use', () => {
  function noticeOf(result: string) {
    return fromResult({ subtype: 'error', is_error: true, error: 'model_not_found', result }).find(
      (event) => event.type === 'notice',
    )
  }

  it('carries which model was refused, since the words shown lose the name', () => {
    const notice = noticeOf("There's an issue with the selected model (opus).")
    expect(notice).toMatchObject({ refused: 'opus' })
    expect(notice?.type === 'notice' && notice.text).not.toContain('selected model')
  })

  it('reads the deployment wording too', () => {
    expect(noticeOf('The model fable is not available on your Bedrock deployment.')).toMatchObject({
      refused: 'fable',
    })
  })

  it('says nothing about refusal when the turn simply failed', () => {
    const notice = fromResult({ subtype: 'error', is_error: true, error: 'error', result: 'boom' }).find(
      (event) => event.type === 'notice',
    )
    expect(notice && 'refused' in notice).toBe(false)
  })
})
