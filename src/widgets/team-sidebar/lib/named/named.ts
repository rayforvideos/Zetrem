import { t } from '@lingui/core/macro'

// A saved title can be empty. Only the screen gives it a name.
export function named(title: string): string {
  return title.trim().length === 0 ? t`New chat` : title
}
