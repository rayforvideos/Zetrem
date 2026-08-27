import { t } from '@lingui/core/macro'

export function named(title: string): string {
  return title.trim().length === 0 ? t`New chat` : title
}
