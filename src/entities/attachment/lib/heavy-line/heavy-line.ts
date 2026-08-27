import { t } from '@lingui/core/macro'
import { IMAGE_MAX_BYTES } from '../attachment/attachment'

// Screen only: kept out of the attachment module, which the main process bundles.
export function heavyLine(name: string): string {
  const max = Math.round(IMAGE_MAX_BYTES / 1024 / 1024)
  return t`${name} is over ${max}MB, so it cannot be sent as a picture. Point at it by path instead.`
}
