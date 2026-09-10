import { StrictMode, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { WorkspaceScreen } from '@/pages/workspace'
import { Boundary } from './Boundary'
import { Toaster } from '@/shared/ui/sonner'
import { COMPOSER_MAX, SHELL_PAD, USAGE_BAR } from '@/shared/config/theme'
import { loadTongue } from '@/shared/lib/say/load'
import { chosenTongue, watchTongue } from '@/shared/lib/say/say'
import './styles/global.css'

window.addEventListener('unhandledrejection', (event) => {
  console.error('[zetrem] a promise was dropped', event.reason)
})

const root = document.getElementById('root')
if (!root) throw new Error('#root not found')

function spoken(): string {
  return i18n.locale
}

function Root() {
  const tongue = useSyncExternalStore(watchTongue, spoken, spoken)
  return <WorkspaceScreen key={tongue} />
}

// A toast has one place: the bottom-right corner, where the eye already is while
// a reply lands or a draft is being typed, and where an Undo is a short reach
// from the card that raised it.
const TOAST_GAP = 12

// The lift that keeps it off the composer is arithmetic, not a measurement. The
// old measured lift moved the toast every time the composer grew or an approval
// card took its place, which is why the toast was banished to the titlebar; a
// constant tall enough for the composer's tallest state buys the same clearance
// and still gives the toast one fixed place of its own. The stack, bottom up:
// the status bar, the shell's padding under the composer, the composer at full
// height with files attached, then the gap.
const TOAST_BOTTOM = USAGE_BAR.height + SHELL_PAD + COMPOSER_MAX + TOAST_GAP

function Toasts() {
  return (
    <Toaster
      position="bottom-right"
      offset={{ bottom: TOAST_BOTTOM, right: 16 }}
      richColors
      closeButton
    />
  )
}

async function firstTongue(): Promise<'en' | 'ko'> {
  const saved = await window.desk.readSettings().catch(() => null)
  return chosenTongue(saved?.tongue ?? 'system', navigator.languages ?? [navigator.language])
}

void firstTongue()
  .then(loadTongue)
  .catch(() => undefined)
  .finally(() => {
    createRoot(root).render(
      <StrictMode>
        {/* <Trans> and useLingui read i18n from this provider; without it the
            first screen that renders one (the account field when claude is
            not found) throws "Cannot read properties of null (reading 'i18n')". */}
        <I18nProvider i18n={i18n}>
          <Boundary>
            <Root />
            <Toasts />
          </Boundary>
        </I18nProvider>
      </StrictMode>,
    )
  })
