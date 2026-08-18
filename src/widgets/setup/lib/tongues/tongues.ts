import { t } from '@lingui/core/macro'

export function tongueChoices(): { id: string; label: string; hint: string }[] {
  return [
    { id: 'system', label: t`System`, hint: t`Follows the language your computer is set to` },
    { id: 'en', label: 'English', hint: t`Always English` },
    { id: 'ko', label: '한국어', hint: t`Always Korean` },
  ]
}
