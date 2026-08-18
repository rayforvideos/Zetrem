import { i18n } from '@lingui/core'
import { msg, t } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
const REASON: Record<string, MessageDescriptor> = {
  error_max_turns: msg`It reached the limit on how many turns one message may take`,
  error_max_budget_usd: msg`It reached the spending limit set for this run`,
  error_max_structured_output_retries: msg`It could not produce the shape the answer had to take`,
  error_during_execution: msg`Something went wrong while it was working`,
  error: msg`Something went wrong`,
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
  if (raw.length === 0) return t`Stopped: something went wrong`
  const body = ourWords(raw)
  return body.length > 0 ? t`Stopped: ${body}` : t`Stopped`
}

function modelLine(error: string, result: string): string | null {
  if (error !== 'model_not_found' && !/selected model/i.test(result)) return null
  const named = /selected model \(([^)]+)\)/i.exec(result)?.[1]
  const who = named === undefined ? t`That model` : named
  return t`${who} is not available on your account. Pick another in Settings.`
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
  if (said.length > 0) return t`Stopped: ${said.join('. ')}`
  return known === undefined ? t`Stopped: ${subtype}` : t`Stopped: ${i18n._(known)}`
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
  return t`${what}. Trying again in ${seconds}, attempt ${which}`
}

function wordFor(reason: string): string {
  switch (reason) {
    case 'rate_limit':
      return t`Rate limited`
    case 'overloaded':
      return t`The model is overloaded`
    case 'server_error':
      return t`The server had a problem`
    case 'authentication_failed':
      return t`Sign in was refused`
    case 'billing_error':
      return t`Billing refused the request`
    case 'invalid_request':
      return t`The request was rejected`
    case 'model_not_found':
      return t`That model was not found`
    case 'max_output_tokens':
      return t`The answer hit the output limit`
    case 'oauth_org_not_allowed':
      return t`Your organisation does not allow this`
    default:
      return t`The request failed`
  }
}
