import { Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { i18n } from '@lingui/core'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type {
  AccountBusy,
  AccountBusyOn,
  AccountHere,
  AccountIdentity,
  AccountRow,
} from '@/entities/auth'
import { ClaudeMark } from '@/shared/graphics/ClaudeMark/ClaudeMark'
import { cn } from '@/shared/lib/cn'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import { Button } from '@/shared/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/shared/ui/field'
import { Spinner } from '@/shared/ui/spinner'
import {
  reauthTitle,
  reauthWarning,
  removeTitle,
  removeWarning,
  signOutTitle,
  signOutWarning,
  switchTitle,
  switchWarning,
} from '../../lib/sign-out-warning/sign-out-warning'
import { nextStep } from '../../lib/next-step/next-step'
import { Badge } from '../PluginShelf/parts'
import type { Account } from '../SetupPane/SetupPane.types'

type Pending =
  | { kind: 'switch'; id: string }
  | { kind: 'reauth'; id: string }
  | { kind: 'remove'; id: string }
  | { kind: 'add' }
  | { kind: 'signout' }

function identityLine(who: AccountIdentity): string {
  return who.orgName === null ? who.email : `${who.email} · ${who.orgName}`
}

// When no kept row byte-matches the machine, a neutral line says what is here
// instead of a row. `named` is Claude Code's own label, not a byte match
// against anything Zetrem kept — and a running claude rewrites that label from
// its own memory, so it can lag. The line says who is reporting it rather than
// asserting it as settled fact.
function hereLine(here: AccountHere): string | null {
  if (here.kind === 'named') return t`Claude Code reports ${identityLine(here)}`
  if (here.kind === 'unnamed') return t`Signed in outside Zetrem.`
  return null
}

function titleOf(row: AccountRow): string {
  return row.email.length > 0 ? row.email : t`Signed in, name not known yet`
}

function seenLine(orgName: string | null, seenAt: number): string {
  const when = new Intl.DateTimeFormat(i18n.locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(seenAt))
  return orgName === null ? when : `${orgName} · ${when}`
}

export function AccountField({ account }: { account: Account }) {
  const { auth, accounts, busy, busyOn } = account
  const [pending, setPending] = useState<Pending | null>(null)

  function act(next: Pending): void {
    if (busy !== null) return
    const step = nextStep(account.sessionLive, next)
    if ('confirm' in step) setPending(step.confirm)
    else go(step.run)
  }

  function go(next: Pending): void {
    setPending(null)
    if (next.kind === 'switch') account.onSwitch(next.id)
    else if (next.kind === 'reauth') account.onReauth(next.id)
    else if (next.kind === 'remove') account.onRemove(next.id)
    else if (next.kind === 'add') account.onAdd()
    else account.onSignOut()
  }

  if (auth?.state === 'cli-missing') {
    return (
      <Field>
        <FieldLabel className="text-muted-foreground">{t`Account`}</FieldLabel>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            onClick={account.onInstall}
            disabled={account.installing}
            className="rounded-full"
          >
            {account.installing && <Spinner data-icon="inline-start" />}
            {account.installing ? t`Installing Claude Code…` : t`Install Claude Code`}
          </Button>
          <FieldDescription className="w-full">
            <Trans>
              The <code className="font-mono">claude</code> command was not found. Zetrem can
              install it for you.
            </Trans>
          </FieldDescription>
          {account.error !== null && (
            <FieldDescription className="w-full text-destructive">{account.error}</FieldDescription>
          )}
        </div>
      </Field>
    )
  }

  const rows = accounts?.accounts ?? []
  const here: AccountHere = accounts?.here ?? { kind: 'signed-out' }
  const signedIn = auth?.state === 'signed-in'
  const bare = rows.length === 0 && !signedIn
  // The two operations that wait on a browser page, and the only ones a person
  // can be left watching with nothing to do: the page can hang, and until now
  // the only way out was the five-minute deadline.
  const signingIn = busy === 'add' || busy === 'reauth'

  return (
    <Field>
      <FieldLabel className="flex items-center gap-2 text-foreground">
        <ClaudeMark size={16} className="text-claude" />
        <span className="text-base font-semibold">Claude</span>
      </FieldLabel>

      {auth?.state === 'unreachable' && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={account.onRecheck}
            className="rounded-full text-muted-foreground"
          >
            {t`Check again`}
          </Button>
          <FieldDescription className="w-full break-all">
            {t`Claude Code did not say whether you are signed in.`} {auth.said}
          </FieldDescription>
        </div>
      )}

      {bare ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            onClick={() => act({ kind: 'add' })}
            disabled={busy !== null}
            className="rounded-full"
          >
            {busy === 'add' && <Spinner data-icon="inline-start" />}
            {busy === 'add' ? t`Signing in through your browser…` : t`Sign in with Anthropic`}
          </Button>
          {signingIn && <CancelLogin onClick={account.onCancelLogin} />}
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between gap-3 pt-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{t`Accounts`}</span>
              <span className="text-xs text-muted-foreground">
                {t`This computer's accounts are listed here. New ones are added here.`}
              </span>
            </div>
            <div className="flex flex-none items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => act({ kind: 'add' })}
                disabled={busy !== null}
                className="rounded-lg"
              >
                {busy === 'add' ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <Plus data-icon="inline-start" />
                )}
                {t`Add account`}
              </Button>
              {signingIn && <CancelLogin onClick={account.onCancelLogin} />}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {hereLine(here) !== null && (
              <p className="px-1 text-xs text-muted-foreground">{hereLine(here)}</p>
            )}
            {rows.map((row: AccountRow) => (
              <AccountCard
                key={row.id}
                id={row.id}
                title={titleOf(row)}
                note={seenLine(row.orgName, row.seenAt)}
                active={here.kind === 'row' && here.id === row.id}
                busy={busy}
                busyOn={busyOn}
                chips={[t`This device`]}
                onPick={() => act({ kind: 'switch', id: row.id })}
              >
                <RowAction
                  label={t`Re-authenticate`}
                  icon={<RefreshCw />}
                  disabled={busy !== null}
                  onClick={() => act({ kind: 'reauth', id: row.id })}
                />
                <RowAction
                  label={t`Remove`}
                  icon={<Trash2 />}
                  disabled={busy !== null}
                  onClick={() => act({ kind: 'remove', id: row.id })}
                />
              </AccountCard>
            ))}
          </div>

          {signedIn && (
            <div className="pt-1" data-account-signout>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy !== null}
                onClick={() => act({ kind: 'signout' })}
                className="h-7 rounded-lg px-2 text-xs text-muted-foreground"
              >
                {busy === 'signout' && <Spinner data-icon="inline-start" />}
                {t`Sign out of Claude Code`}
              </Button>
            </div>
          )}
        </>
      )}

      {account.note !== '' && (
        <FieldDescription className="w-full break-all">
          <Trans>
            If the browser did not open,{' '}
            <a href={account.note} data-selectable className="underline underline-offset-2">
              open this link
            </a>
            .
          </Trans>
        </FieldDescription>
      )}
      {account.error !== null && (
        <FieldDescription className="text-destructive">{account.error}</FieldDescription>
      )}

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent data-account-confirm>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending && dialogTitle(pending)}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending && dialogWarning(pending, here)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t`Keep working`}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pending && go(pending)}
            >{t`Continue`}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Field>
  )
}

// Beside the busy add button rather than on the row a re-auth is running on:
// there is one browser login at a time, so there is one cancel.
function CancelLogin({ onClick }: { onClick(): void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      data-account-cancel-login
      className="h-7 rounded-lg px-2 text-xs text-muted-foreground"
    >
      <X data-icon="inline-start" />
      {t`Cancel sign-in`}
    </Button>
  )
}

function AccountCard({
  id,
  title,
  note,
  extra = null,
  active,
  busy,
  busyOn,
  chips = [],
  onPick,
  children,
}: {
  id: string
  title: string
  note: string
  extra?: string | null
  active: boolean
  busy: AccountBusy
  busyOn: AccountBusyOn
  chips?: string[]
  onPick(): void
  children?: React.ReactNode
}) {
  const working = busyOn !== null && busyOn.id === id
  return (
    <div
      data-account-row={id}
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3.5 py-3 text-sm',
        active ? 'border-foreground/25 bg-card' : 'border-transparent bg-card/50',
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="bare"
        aria-pressed={active}
        disabled={busy !== null}
        onClick={onPick}
        className="flex min-w-0 flex-1 flex-col items-start justify-start gap-1 rounded-lg px-1 py-0.5 text-left font-normal disabled:opacity-70"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{title}</span>
          {chips.map((chip) => (
            <Badge key={chip}>{chip}</Badge>
          ))}
          {active && <Badge tone="attention">{t`Active`}</Badge>}
        </span>
        <span className="truncate text-xs text-muted-foreground">{note}</span>
        {extra !== null && <span className="truncate text-xs text-muted-foreground">{extra}</span>}
      </Button>
      <span className="flex flex-none items-center gap-1">
        {working ? <Spinner className="size-4 text-muted-foreground" /> : children}
      </span>
    </div>
  )
}

function dialogTitle(pending: Pending): string {
  switch (pending.kind) {
    case 'signout':
      return signOutTitle()
    case 'remove':
      return removeTitle()
    case 'reauth':
      return reauthTitle()
    default:
      return switchTitle()
  }
}

function dialogWarning(pending: Pending, here: AccountHere): string {
  switch (pending.kind) {
    case 'signout':
      return signOutWarning(true)
    case 'remove':
      return removeWarning(here.kind === 'row' && here.id === pending.id)
    case 'reauth':
      return reauthWarning(true)
    default:
      return switchWarning(true)
  }
}

function RowAction({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string
  icon?: React.ReactNode
  disabled: boolean
  onClick(): void
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className="h-7 rounded-lg px-2 text-xs text-muted-foreground"
    >
      {icon !== undefined && <span className="[&_svg]:size-3.5">{icon}</span>}
      {label}
    </Button>
  )
}
