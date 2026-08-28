import { i18n } from '@lingui/core'
import { messages as english } from '../../locales/en/messages.po'
import { tongueChanged } from './say'
import type { Tongue } from './say.types'

// i18n must never be left inactive: every screen reads through it. If the
// chosen catalog cannot be loaded, English is bundled statically and takes
// over, and the cause goes to the log for the person who reads it.
export async function loadTongue(tongue: Tongue): Promise<void> {
  try {
    const { messages } = await import(`../../locales/${tongue}/messages.po`)
    if (messages == null) throw new Error(`the ${tongue} catalog has no messages`)
    i18n.load(tongue, messages)
    i18n.activate(tongue)
  } catch (cause: unknown) {
    console.error(`[zetrem] could not load the ${tongue} catalog, speaking English`, cause)
    i18n.load('en', english)
    i18n.activate('en')
  }
  tongueChanged()
}
