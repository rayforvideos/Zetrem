import { t } from '@lingui/core/macro'

// The tone is what the dot is drawn as; 'held' covers everything the run has
// stopped for, so a permission ask and a question read as one state on the
// row and differ only in what the label says they are waiting for.
export function liveMark(state: 'working' | 'asking' | 'question' | undefined) {
  if (state === 'working') return { label: t`Still replying`, tone: 'working' as const }
  if (state === 'asking') return { label: t`Waiting for your permission`, tone: 'held' as const }
  if (state === 'question') return { label: t`Waiting for your answer`, tone: 'held' as const }
  return null
}
