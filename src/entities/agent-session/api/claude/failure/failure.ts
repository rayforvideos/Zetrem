const REASON: Record<string, string> = {
  error_max_turns: 'It reached the limit on how many turns one message may take',
  error_max_budget_usd: 'It reached the spending limit set for this run',
  error_max_structured_output_retries: 'It could not produce the shape the answer had to take',
  error_during_execution: 'Something went wrong while it was working',
  error: 'Something went wrong',
}

const MODEL_HELP = /run\s+--model[^.]*\.?/i

const DIAGNOSTIC = /^\[?[a-z0-9_]+\]?(\s+[a-z0-9_]+=\S*)+$/i

export function stoppedLine(event: {
  subtype: string
  isError: boolean
  error: string
  result: string
  errors: unknown
}): string | null {
  const named = modelLine(event.error, event.result)
  if (named !== null) return named
  const said = failureLine(event.subtype, event.errors)
  if (said !== null) return said
  if (!event.isError) return null
  const raw = event.result.trim()
  if (raw.length === 0) return 'Stopped: something went wrong'
  const body = ourWords(raw)
  return body.length > 0 ? `Stopped: ${body}` : 'Stopped'
}

function modelLine(error: string, result: string): string | null {
  if (error !== 'model_not_found' && !/selected model/i.test(result)) return null
  const named = /selected model \(([^)]+)\)/i.exec(result)?.[1]
  const who = named === undefined ? 'That model' : named
  return `${who} is not available on your account. Pick another in Settings.`
}

function ourWords(said: string): string {
  const plain = said.replace(MODEL_HELP, '').trim()
  return DIAGNOSTIC.test(plain) ? '' : plain
}

export function failureLine(subtype: string, errors: unknown): string | null {
  if (!subtype.startsWith('error')) return null
  const said = Array.isArray(errors)
    ? errors
        .filter((line): line is string => typeof line === 'string' && line.length > 0)
        .map((line) => ourWords(line))
        .filter((line) => line.length > 0)
    : []
  const known = REASON[subtype]
  if (said.length > 0) return `Stopped: ${said.join('. ')}`
  return known ? `Stopped: ${known}` : `Stopped: ${subtype}`
}

export function retryLine(
  attempt: number,
  max: number,
  delayMs: number,
  reason: string,
  status: number | null,
): string {
  const which = max > 0 ? `${attempt} of ${max}` : `${attempt}`
  const seconds = delayMs >= 1000 ? `${Math.round(delayMs / 1000)}s` : `${delayMs}ms`
  const what = status !== null ? `${wordFor(reason)} (${status})` : wordFor(reason)
  return `${what}. Trying again in ${seconds}, attempt ${which}`
}

function wordFor(reason: string): string {
  switch (reason) {
    case 'rate_limit':
      return 'Rate limited'
    case 'overloaded':
      return 'The model is overloaded'
    case 'server_error':
      return 'The server had a problem'
    case 'authentication_failed':
      return 'Sign in was refused'
    case 'billing_error':
      return 'Billing refused the request'
    case 'invalid_request':
      return 'The request was rejected'
    case 'model_not_found':
      return 'That model was not found'
    case 'max_output_tokens':
      return 'The answer hit the output limit'
    case 'oauth_org_not_allowed':
      return 'Your organisation does not allow this'
    default:
      return 'The request failed'
  }
}
