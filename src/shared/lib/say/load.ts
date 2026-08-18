import { i18n } from '@lingui/core'
import { tongueChanged } from './say'
import type { Tongue } from './say.types'

export async function loadTongue(tongue: Tongue): Promise<void> {
  const { messages } = await import(`../../locales/${tongue}/messages.po`)
  i18n.load(tongue, messages)
  i18n.activate(tongue)
  tongueChanged()
}
