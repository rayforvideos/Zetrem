import { i18n } from '@lingui/core'
import type { Said } from './read.types'

export function read(said: Said): string {
  return typeof said === 'string' ? said : i18n._(said)
}
