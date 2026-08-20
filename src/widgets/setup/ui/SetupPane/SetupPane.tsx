import { useEffect } from 'react'
import { startBlocker } from '../../lib/start-blocker/start-blocker'
import { tongueChoices } from '../../lib/tongues/tongues'
import { MODELS, PERMISSION_MODES } from '@/entities/agent-session'
import type { ModelChoice, PermissionMode, Settings } from '@/entities/agent-session'
import { i18n } from '@lingui/core'
import { t } from '@lingui/core/macro'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Switch } from '@/shared/ui/switch'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { WORDMARK_SIZE, Wordmark } from '@/shared/graphics/wordmark/wordmark'
import { AccountField } from '../AccountField/AccountField'
import { YouField } from '../YouField/YouField'
import { ChoiceField } from '../ChoiceField/ChoiceField'
import { ProjectField } from '../ProjectField/ProjectField'
import type { SetupPaneProps } from './SetupPane.types'

export type { SetupPaneProps } from './SetupPane.types'

export function SetupPane({
  account,
  you,
  project,
  defaults,
  plugins,
  actions,
  notice,
}: SetupPaneProps) {
  const { reopened, onCancel } = actions
  const blocker = startBlocker(actions.signedIn, actions.hasProject)
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
    <div className="relative z-[3] flex h-full min-h-0 flex-col">
      <div className="zt-scroll min-h-0 flex-1 overflow-y-auto pr-2.5">
        <div className="zt-enter mx-auto flex min-h-full w-full max-w-[560px] flex-col gap-8 pt-8 pb-20 [&>*:first-child]:mt-auto [&>*:last-child]:mb-auto">
          <div className="flex flex-col gap-3">
            <Wordmark width={WORDMARK_SIZE.setup} />
            <p className="max-w-[380px] text-sm leading-relaxed break-keep text-muted-foreground">
              {t`Set a few things and your agents get to work!`}
            </p>
          </div>

          <FieldGroup className="gap-5">
            <AccountField account={account} />
            <YouField name={you.name} face={you.face} onName={you.onName} onFace={you.onFace} />
            <ProjectField project={project} />
            <ChoiceField
              label={t`Language`}
              options={tongueChoices()}
              chosen={defaults.tongue}
              onChoose={(id) => defaults.onTongue(id as Settings['tongue'])}
            />
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
                onCheckedChange={defaults.onNotify}
                aria-label={t`Notifications`}
              />
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

          {notice !== null && (
            <Alert variant="destructive" data-notice>
              <AlertTitle>{notice.what}</AlertTitle>
              <AlertDescription>{notice.why}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <div data-actions className="zt-veil-up flex-none bg-background">
        <div className="mx-auto flex w-full max-w-[560px] flex-wrap items-center justify-end gap-3 py-4">
          {blocker !== null && (
            <span className="mr-auto text-sm text-muted-foreground">{i18n._(blocker)}</span>
          )}
          {actions.reopened && (
            <Button variant="ghost" onClick={actions.onCancel} className="rounded-full">
              {t`Cancel`}
            </Button>
          )}
          <Button onClick={actions.onStart} disabled={!canStart} className="rounded-full">
            {actions.reopened ? t`Done` : t`Start`}
          </Button>
        </div>
      </div>
    </div>
  )
}
