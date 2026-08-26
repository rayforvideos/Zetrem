import { t } from '@lingui/core/macro'
import { modelLabel } from '@/shared/lib/model-label/model-label'

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function noticeLine(event: Record<string, unknown>): string | null {
  const said = text(event.content) || text(event.text)
  return said.length > 0 ? said : null
}

export function deniedLine(event: Record<string, unknown>): string {
  const tool = text(event.tool_name) || t`A tool`
  const why = text(event.message) || text(event.decision_reason)
  return why.length > 0 ? t`${tool} was not allowed: ${why}` : t`${tool} was not allowed`
}

export function refusalLine(event: Record<string, unknown>): string {
  const said = text(event.content)
  const from = modelLabel(text(event.original_model)) ?? ''
  const to = modelLabel(text(event.fallback_model)) ?? ''
  const swap = to.length > 0 && from.length > 0 ? t`${from} declined this, so ${to} took it` : ''
  const why = text(event.api_refusal_explanation)
  return [swap || t`The model declined this`, said || why].filter(Boolean).join('. ')
}

export function noFallbackLine(event: Record<string, unknown>): string {
  const said = text(event.content) || text(event.api_refusal_explanation)
  const from = modelLabel(text(event.original_model)) ?? ''
  const who = from.length > 0 ? from : t`The model`
  return said.length > 0
    ? t`${who} declined this and there is nothing to fall back to. ${said}`
    : t`${who} declined this and there is nothing to fall back to`
}

export function shutdownLine(event: Record<string, unknown>): string {
  const why = text(event.reason)
  return why.length > 0 ? t`The session is closing: ${why}` : t`The session is closing`
}
