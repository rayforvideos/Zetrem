import { t } from '@lingui/core/macro'

export function liveMark(state: 'working' | 'asking' | undefined) {
  if (state === 'working') return { label: t`Still replying`, tone: 'working' as const }
  if (state === 'asking') return { label: t`Waiting for your permission`, tone: 'asking' as const }
  return null
}
