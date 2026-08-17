import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'
import { Button } from '@/shared/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/shared/ui/field'
import { Spinner } from '@/shared/ui/spinner'
import { SIGN_OUT_TITLE, signOutHint, signOutWarning } from '../../lib/sign-out-warning/sign-out-warning'
import type { Account } from '../SetupPane/SetupPane.types'

export function AccountField({ account }: { account: Account }) {
  const { auth } = account

  return (
    <Field>
      <FieldLabel className="text-muted-foreground">Account</FieldLabel>
      {auth?.state === 'cli-missing' ? (
        <FieldDescription className="text-foreground">
          <code className="font-mono">claude</code> command not found. Install it, then reopen
          Zetrem.
        </FieldDescription>
      ) : auth?.state === 'signed-in' ? (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-card px-3.5 py-2.5 text-sm">
            <span className="min-w-0 flex-1 truncate">
              {auth.email}
              {auth.orgName !== null && (
                <span className="text-muted-foreground"> · {auth.orgName}</span>
              )}
            </span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={account.signingOut}
                  className="rounded-full text-muted-foreground"
                >
                  {account.signingOut && <Spinner data-icon="inline-start" />}
                  {account.signingOut ? 'Signing out…' : 'Sign out'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent data-sign-out-confirm>
                <AlertDialogHeader>
                  <AlertDialogTitle>{SIGN_OUT_TITLE}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {signOutWarning(account.sessionLive)}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Stay signed in</AlertDialogCancel>
                  <AlertDialogAction onClick={account.onSignOut}>Sign out</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <FieldDescription className={account.error !== null ? 'text-destructive' : undefined}>
            {account.error ?? signOutHint(account.sessionLive)}
          </FieldDescription>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            onClick={account.onSignIn}
            disabled={account.signingIn}
            className="rounded-full"
          >
            {account.signingIn && <Spinner data-icon="inline-start" />}
            {account.signingIn ? 'Signing in through your browser…' : 'Sign in with Anthropic'}
          </Button>
          {account.note !== '' && (
            <FieldDescription className="w-full break-all">
              If the browser did not open,{' '}
              <a href={account.note} data-selectable className="underline underline-offset-2">
                open this link
              </a>
              .
            </FieldDescription>
          )}
        </div>
      )}
    </Field>
  )
}

