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
import { Welcome } from './Welcome'
import { installDemoDesk, releaseTape } from './desk'
import { DEMO_STEPS } from './steps'
import { ZETREM_HOME } from './links'
import { DEMO_PROMPT } from './script'
import { sendNow, typeOnly } from './typing'

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
  if (step.id === 'ask' && !asked) {
    asked = true
    void typeOnly(DEMO_PROMPT)
    return
  }
  // The tape is parked between stops, and arriving at one is what lets it run
  // to the next, so the screen moves when the visitor does and never before
  // they have read why it is about to.
  if (step.id === 'crew') sendNow()
  // Released a stop early, so the ask the next stop is about is already on
  // screen when the visitor gets there: a tour that vanishes while it waits
  // for something reads as broken.
  if (step.id === 'crew-open') releaseTape()
  // A stop that is about a screen the visitor is not on opens it for them, and
  // one that has moved past a screen closes it behind them: the tour is the
  // only thing steering, so nothing is left ajar for the next stop to fight.
  // The library has had its turn by now; the next stop is about the sidebar,
  // and a pane still covering the conversation behind it only confuses what
  // the light is pointing at.
  if (step.id === 'hire') press('[data-leave-library]')
  if (step.id === 'git-open') press('[data-member-cancel]')
  if (step.id === 'settings-open') press('[data-git-drawer] [data-git-close]', '[data-git-button]')
  if (step.id === 'settings-session') press('[data-setup-tab="session"]')
  if (step.id === 'outro') press('[data-setup-cancel]')
}

// Clicks the first of these that is on screen. The tour opens and closes the
// app's own panels this way rather than reaching into its state, so what the
// visitor sees is what any press of that control would have done.
function press(...selectors: string[]): void {
  // The panel a stop is about is often mounting as the stop arrives, so the
  // control is waited for rather than missed by a frame.
  let left = 40
  const look = (): void => {
    for (const selector of selectors) {
      const found = document.querySelector<HTMLElement>(selector)
      if (found !== null) {
        found.click()
        return
      }
    }
    left -= 1
    if (left > 0) setTimeout(look, 50)
  }
  look()
}

// A badge that stays put for the whole visit. The opening card says this is a
// recording, but a card is read once and then dismissed, and somebody who
// lands mid-tour should still never mistake this for their own session.
function markAsDemo(): void {
  const mark = document.createElement('div')
  mark.className =
    'pointer-events-none fixed top-2 left-1/2 z-[80] -translate-x-1/2 rounded-full border border-border/70 bg-card/90 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur'
  const said = document.createElement('span')
  said.textContent =
    '\ub370\ubaa8 \u00b7 \uae30\ub85d\ub41c \uc138\uc158\uc744 \uc7ac\uc0dd\ud569\ub2c8\ub2e4'
  const to = document.createElement('a')
  to.href = ZETREM_HOME
  to.target = '_blank'
  to.rel = 'noreferrer'
  to.textContent = 'Zetrem \ud648\ud398\uc774\uc9c0'
  to.className = 'pointer-events-auto ml-2 underline underline-offset-2 hover:text-foreground'
  mark.append(said, to)
  document.body.append(mark)
}

markAsDemo()

// The tour is over but the screen it ran on is still there to poke at, so the
// way back is offered rather than taken: a reload is the only honest restart,
// since the recorded run has already been spent.
function offerAgain(): void {
  const row = document.createElement('div')
  // Clear of the status bar along the bottom edge, which a plain bottom-4
  // would sit on top of.
  row.className = 'fixed right-4 bottom-11 z-[80] flex items-center gap-2'

  const again = document.createElement('button')
  again.type = 'button'
  again.textContent = '\ucc98\uc74c\ubd80\ud130 \ub2e4\uc2dc \ubcf4\uae30'
  again.className =
    'rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground shadow-lg hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
  again.addEventListener('click', () => {
    window.location.reload()
  })

  // The last word of the tour points at the homepage, so the way there is a
  // button and not a sentence the visitor has to go looking for.
  const home = document.createElement('a')
  home.href = ZETREM_HOME
  home.target = '_blank'
  home.rel = 'noreferrer'
  home.textContent = 'Zetrem \ud648\ud398\uc774\uc9c0'
  home.className =
    'rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'

  row.append(again, home)
  document.body.append(row)
}

const root = createRoot(stage)

function showTour(): void {
  root.render(
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
}

root.render(
  <StrictMode>
    <I18nProvider i18n={i18n}>
      <Welcome onStart={showTour} />
    </I18nProvider>
  </StrictMode>,
)
