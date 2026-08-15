import { modelLabel } from '@/shared/lib/model-label/model-label'

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function noticeLine(event: Record<string, unknown>): string | null {
  const said = text(event.content) || text(event.text)
  return said.length > 0 ? said : null
}

export function deniedLine(event: Record<string, unknown>): string {
  const tool = text(event.tool_name) || 'A tool'
  const why = text(event.message) || text(event.decision_reason)
  return why.length > 0 ? `${tool} was not allowed: ${why}` : `${tool} was not allowed`
}

export function refusalLine(event: Record<string, unknown>): string {
  const said = text(event.content)
  const from = modelLabel(text(event.original_model)) ?? ''
  const to = modelLabel(text(event.fallback_model)) ?? ''
  const swap = to.length > 0 && from.length > 0 ? `${from} declined this, so ${to} took it` : ''
  const why = text(event.api_refusal_explanation)
  return [swap || 'The model declined this', said || why].filter(Boolean).join('. ')
}

export function noFallbackLine(event: Record<string, unknown>): string {
  const said = text(event.content) || text(event.api_refusal_explanation)
  const from = modelLabel(text(event.original_model)) ?? ''
  const who = from.length > 0 ? from : 'The model'
  return said.length > 0
    ? `${who} declined this and there is nothing to fall back to. ${said}`
    : `${who} declined this and there is nothing to fall back to`
}

export function shutdownLine(event: Record<string, unknown>): string {
  const why = text(event.reason)
  return why.length > 0 ? `The session is closing: ${why}` : 'The session is closing'
}
