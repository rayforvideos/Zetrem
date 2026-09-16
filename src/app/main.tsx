import { StrictMode, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { WorkspaceScreen } from '@/pages/workspace'
import { Boundary } from './Boundary'
import { Toaster } from '@/shared/ui/sonner'
import { USAGE_BAR } from '@/shared/config/theme'
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

// A toast has one place: the bottom-right corner, clear of the status bar and
// nothing else. It was lifted the height of the composer at its tallest, which
// left it floating in the middle of the screen: the composer is centred and
// narrower than the window, so a toast at the right edge was never over it.
const TOAST_GAP = 12

const TOAST_BOTTOM = USAGE_BAR.height + TOAST_GAP

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
