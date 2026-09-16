// The demo boots the app itself. Only the bridge under it is different, so the
// screen above is the shipped renderer and nothing here reaches into it.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
// Pulled in statically so the stylesheet is linked in the page itself: the app
// imports it from a chunk this entry only reaches by dynamic import, and a
// stylesheet that arrives that late leaves the first paint unstyled.
import '@/app/styles/global.css'
import { loadTongue } from '@/shared/lib/say/load'
import { TourOverlay } from '@/app/demo/tour/TourOverlay'
import { installDemoDesk } from './desk'
import { DEMO_STEPS } from './steps'
import { DEMO_PROMPT } from './script'
import { typeAndSend } from './typing'

installDemoDesk()

// The tour speaks through the same catalogue the app does, and a translation
// asked for before a locale is active throws. The app loads one of its own on
// the way up, but nothing here may assume that race was won first.
await loadTongue('ko')

// Imported after the bridge is in place: the app reads settings as it loads,
// and a bridge installed a tick later would miss that first read.
await import('@/app/main')

// The tour rides in a root of its own, appended beside the app's. Nothing in
// the app knows about it, which is what keeps the screen under it the shipped
// screen rather than a demo-shaped copy of it.
const stage = document.createElement('div')
document.body.append(stage)
// The tour drives the run rather than racing it: the ask is typed when the
// step that explains it arrives, so a visitor reading the opening card does
// not come back to a question that was asked and answered without them.
let asked = false

function onStepChange(step: { id: string }): void {
  if (step.id !== 'ask' || asked) return
  asked = true
  void typeAndSend(DEMO_PROMPT)
}

// The tour is over but the screen it ran on is still there to poke at, so the
// way back is offered rather than taken: a reload is the only honest restart,
// since the recorded run has already been spent.
function offerAgain(): void {
  const again = document.createElement('button')
  again.type = 'button'
  again.textContent = '\ucc98\uc74c\ubd80\ud130 \ub2e4\uc2dc \ubcf4\uae30'
  again.className =
    'fixed right-4 bottom-4 z-50 rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground shadow-lg hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
  again.addEventListener('click', () => {
    window.location.reload()
  })
  document.body.append(again)
}

createRoot(stage).render(
  <StrictMode>
    <I18nProvider i18n={i18n}>
      <TourOverlay
        steps={DEMO_STEPS}
        onStepChange={onStepChange}
        onDone={() => {
          stage.remove()
          offerAgain()
        }}
        // A step waits on the run, not the other way round: the tiles and the
        // permission card only exist once the recorded session reaches them.
        waitMs={25_000}
      />
    </I18nProvider>
  </StrictMode>,
)
