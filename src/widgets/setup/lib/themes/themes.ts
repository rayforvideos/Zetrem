import { t } from '@lingui/core/macro'

export function themeChoices(): { id: string; label: string; hint: string }[] {
  return [
    { id: 'system', label: t`Match system`, hint: t`Follows your computer's light or dark setting` },
    { id: 'dark', label: t`Dark`, hint: t`Always dark` },
    { id: 'light', label: t`Light`, hint: t`Always light` },
  ]
}
