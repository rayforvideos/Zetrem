import { useEffect, useState } from 'react'
import { startBlocker } from '../../lib/start-blocker/start-blocker'
import { useNotifyGate } from '../../model/useNotifyGate'
import { tongueChoices } from '../../lib/tongues/tongues'
import { EFFORTS, MODELS, PERMISSION_MODES } from '@/entities/settings'
import type { Settings } from '@/entities/settings'
import type { ModelChoice, PermissionMode, EffortChoice } from '@/entities/claude-cli'
import { i18n } from '@lingui/core'
import { t } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { cn } from '@/shared/lib/cn'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Switch } from '@/shared/ui/switch'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { WORDMARK_SIZE, Wordmark } from '@/shared/graphics/Wordmark/Wordmark'
import { AccountField } from '../AccountField/AccountField'
import { StockList } from '@/entities/teammate'
import { YouField } from '../YouField/YouField'
import { ChoiceField } from '../ChoiceField/ChoiceField'
import { MemoryField } from '../MemoryField/MemoryField'
import { ProjectField } from '../ProjectField/ProjectField'
import type { SetupPaneProps, SetupTab } from './SetupPane.types'

export type { SetupPaneProps } from './SetupPane.types'

const TABS: { id: SetupTab; label: MessageDescriptor }[] = [
  { id: 'start', label: msg`Start` },
  { id: 'general', label: msg`General` },
  { id: 'session', label: msg`Session` },
  { id: 'memory', label: msg`Memory` },
  { id: 'extensions', label: msg`Extensions` },
]

export function SetupPane({
  account,
  you,
  project,
  defaults,
  plugins,
  agents,
  actions,
  notice,
}: SetupPaneProps) {
  const { reopened, onCancel } = actions
  const [tab, setTab] = useState<SetupTab>('start')
  const blocker = startBlocker(actions.signedIn, actions.hasProject)
  const notifyGate = useNotifyGate(defaults.onNotify)
  const canStart = blocker === null

  useEffect(() => {
    if (!reopened) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reopened, onCancel])

  return (
    <div data-setup-pane className="relative z-[3] flex h-full min-h-0 flex-col">
      <div className="zt-scroll min-h-0 flex-1 overflow-y-auto pr-2.5">
        {/* Anchored to the top: the tabs differ in height, and a centred column would
            jump the header on every switch. */}
        <div className="zt-enter mx-auto flex w-full max-w-[680px] flex-col gap-8 pt-14 pb-20">
          <div className="flex flex-col gap-3">
            <Wordmark width={WORDMARK_SIZE.setup} />
            <p className="max-w-[380px] text-sm leading-relaxed break-keep text-muted-foreground">
              {t`Set a few things and your agents get to work!`}
            </p>
          </div>

          <div className="flex min-w-0 gap-6">
            <nav aria-label={t`Settings sections`} className="flex w-28 flex-none flex-col gap-1">
              {TABS.map((one) => (
                <Button
                  key={one.id}
                  variant="ghost"
                  size="bare"
                  onClick={() => setTab(one.id)}
                  aria-current={tab === one.id ? 'true' : undefined}
                  className={cn(
                    'h-8 justify-start rounded-lg px-2.5 text-left text-sm',
                    tab === one.id ? 'bg-card text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {i18n._(one.label)}
                </Button>
              ))}
            </nav>

            <div className="min-h-[420px] min-w-0 flex-1">
              {/* Tabs stay mounted, hidden rather than gone, so a name someone is typing
                  survives a wander through the tabs. */}
              <section hidden={tab !== 'start'} className="zt-rise">
                <FieldGroup className="gap-5">
                  <AccountField account={account} />
                  <ProjectField project={project} />
                </FieldGroup>
              </section>
              <section hidden={tab !== 'general'} className="zt-rise">
                <FieldGroup className="gap-5">
                  <YouField
                    name={you.name}
                    face={you.face}
                    onName={you.onName}
                    onFace={you.onFace}
                  />
                  <ChoiceField
                    label={t`Language`}
                    options={tongueChoices()}
                    chosen={defaults.tongue}
                    onChoose={(id) => defaults.onTongue(id as Settings['tongue'])}
                  />
                  <Field orientation="horizontal" className="rounded-2xl bg-card p-4">
                    <FieldContent>
                      <FieldLabel htmlFor="enter-sends">{t`Send with Enter`}</FieldLabel>
                      <FieldDescription>
                        {t`Shift+Enter starts a new line. Off, sending takes the modifier key with Enter.`}
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id="enter-sends"
                      checked={defaults.enterSends}
                      onCheckedChange={defaults.onEnterSends}
                      aria-label={t`Send with Enter`}
                    />
                  </Field>
                  <Field orientation="horizontal" className="rounded-2xl bg-card p-4">
                    <FieldContent>
                      <FieldLabel htmlFor="notify">{t`Notifications`}</FieldLabel>
                      <FieldDescription>
                        {t`Tells you when the work is done or something needs your say-so, and only while Zetrem is behind another window.`}
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id="notify"
                      checked={defaults.notify}
                      onCheckedChange={notifyGate.set}
                      aria-label={t`Notifications`}
                    />
                  </Field>
                </FieldGroup>
              </section>
              <section hidden={tab !== 'session'} className="zt-rise">
                <FieldGroup className="gap-5">
                  <ChoiceField
                    label={t`Permissions`}
                    options={PERMISSION_MODES}
                    chosen={defaults.permissionMode}
                    onChoose={(id) => defaults.onPermissionMode(id as PermissionMode)}
                  />
                  <ChoiceField
                    label={t`Model`}
                    options={MODELS}
                    chosen={defaults.model}
                    onChoose={(id) => defaults.onModel(id as ModelChoice)}
                  />
                  <ChoiceField
                    label={t`Effort`}
                    options={EFFORTS}
                    chosen={defaults.effort}
                    onChoose={(id) => defaults.onEffort(id as EffortChoice)}
                  />
                  <Field orientation="horizontal" className="rounded-2xl bg-card p-4">
                    <FieldContent>
                      <FieldLabel htmlFor="chrome">{t`Claude in Chrome`}</FieldLabel>
                      <FieldDescription>
                        {t`Lets the session read and drive your browser. Needs the Chrome extension, and the first run may ask for your say-so in the browser.`}
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id="chrome"
                      checked={defaults.chrome}
                      onCheckedChange={defaults.onChrome}
                      aria-label={t`Claude in Chrome`}
                    />
                  </Field>
                </FieldGroup>
              </section>
              <section hidden={tab !== 'memory'} className="zt-rise">
                <FieldGroup className="gap-5">
                  <MemoryField active={tab === 'memory'} />
                </FieldGroup>
              </section>
              <section hidden={tab !== 'extensions'} className="zt-rise">
                <FieldGroup className="gap-5">
                  <Field className="rounded-2xl bg-card p-4">
                    <FieldContent>
                      <FieldLabel>{t`Agents`}</FieldLabel>
                      <FieldDescription>
                        {t`The agents Claude Code brings. Each can be switched off.`}
                      </FieldDescription>
                    </FieldContent>
                    <StockList {...agents} avatar={24} />
                  </Field>
                  <Field orientation="horizontal" className="rounded-2xl bg-card p-4">
                    <FieldContent>
                      <FieldLabel>{t`Plugins`}</FieldLabel>
                      <FieldDescription>{plugins.summary}</FieldDescription>
                    </FieldContent>
                    <Button variant="ghost" onClick={plugins.onOpen} className="rounded-full">
                      {t`Manage`}
                    </Button>
                  </Field>
                </FieldGroup>
              </section>
            </div>
          </div>

          {notice !== null && (
            <Alert variant="destructive" data-notice>
              <AlertTitle>{notice.what}</AlertTitle>
              <AlertDescription>{notice.why}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <div data-actions className="zt-veil-up flex-none bg-background">
        <div className="mx-auto flex w-full max-w-[680px] flex-wrap items-center justify-end gap-3 py-4">
          {blocker !== null && (
            <span className="mr-auto text-sm text-muted-foreground">{i18n._(blocker)}</span>
          )}
          {reopened && (
            <Button variant="ghost" onClick={onCancel} className="rounded-full">
              {t`Cancel`}
            </Button>
          )}
          <Button onClick={actions.onStart} disabled={!canStart} className="rounded-full">
            {reopened ? t`Done` : t`Start`}
          </Button>
        </div>
      </div>
    </div>
  )
}
