import { MODELS, PERMISSION_MODES } from '@/entities/agent-session'
import type { ModelChoice, PermissionMode } from '@/entities/agent-session'
import type { AuthStatus } from '@/entities/auth'
import type { Failure } from '@/shared/lib/failure/failure.types'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Switch } from '@/shared/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { Spinner } from '@/shared/ui/spinner'
import { WORDMARK_SIZE, Wordmark } from '@/shared/graphics/wordmark/wordmark'

type SetupPaneProps = {
  auth: AuthStatus | null
  project: { name: string; path: string } | null
  permissionMode: PermissionMode
  model: ModelChoice
  onLogin(): void
  onPickProject(): void
  onPermissionMode(mode: PermissionMode): void
  onModel(model: ModelChoice): void
  onlyOurAgents: boolean
  onOnlyOurAgents(only: boolean): void
  ourAgentCount: number
  onStart(): void
  onCancel(): void
  reopened: boolean
  canStart: boolean
  loggingIn: boolean
  loginNote: string
  onLogout(): void
  loggingOut: boolean
  sessionLive: boolean
  authError: string | null
  notice: Failure | null
}

export function SetupPane({
  auth,
  project,
  permissionMode,
  model,
  onLogin,
  onPickProject,
  onPermissionMode,
  onModel,
  onlyOurAgents,
  onOnlyOurAgents,
  ourAgentCount,
  onStart,
  onCancel,
  reopened,
  canStart,
  loggingIn,
  loginNote,
  onLogout,
  loggingOut,
  sessionLive,
  authError,
  notice,
}: SetupPaneProps) {
  return (
    <div className="zt-scroll relative z-[3] h-full overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col justify-center gap-8 py-8">
      <div className="flex flex-col gap-3">
        <Wordmark width={WORDMARK_SIZE.setup} />
        <p className="max-w-[380px] text-sm leading-relaxed break-keep text-muted-foreground">
          Set a few things and your agents get to work!
        </p>
      </div>

      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel className="text-muted-foreground">Account</FieldLabel>
          {auth?.state === 'cli-missing' ? (
            <FieldDescription className="text-foreground">
              <code className="font-mono">claude</code> command not found. Install it, then reopen Zetrem.
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
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onLogout}
                  disabled={loggingOut}
                  className="rounded-full text-muted-foreground"
                >
                  {loggingOut && <Spinner data-icon="inline-start" />}
                  {loggingOut ? 'Signing out…' : 'Sign out'}
                </Button>
              </div>
              <FieldDescription className={authError !== null ? 'text-destructive' : undefined}>
                {authError ??
                  (sessionLive
                    ? 'Signing out stops the running session. You can sign back in as anyone.'
                    : 'Sign out to use a different Anthropic account.')}
              </FieldDescription>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                onClick={onLogin}
                disabled={loggingIn}
                className="rounded-full"
              >
                {loggingIn && <Spinner data-icon="inline-start" />}
                {loggingIn ? 'Signing in through your browser…' : 'Sign in with Anthropic'}
              </Button>
              {loginNote !== '' && (
                <FieldDescription className="w-full break-all">
                  If the browser did not open,{' '}
                  <a href={loginNote} data-selectable className="underline underline-offset-2">
                    open this link
                  </a>
                  .
                </FieldDescription>
              )}
            </div>
          )}
        </Field>

        <Field>
          <FieldLabel className="text-muted-foreground">Project</FieldLabel>
          <div className="flex flex-wrap items-center gap-3">
            {project && (
              <span className="min-w-0 flex-1 truncate rounded-xl bg-card px-3.5 py-2.5 font-mono text-sm">
                {project.path}
              </span>
            )}
            <Button
              size="sm"
              variant={project ? 'secondary' : 'default'}
              onClick={onPickProject}
              className="rounded-full"
            >
              {project ? 'Change' : 'Choose folder'}
            </Button>
          </div>
        </Field>

        <Field>
          <FieldLabel className="text-muted-foreground">Permissions</FieldLabel>
          <div>
            <ToggleGroup
              type="single"
              value={permissionMode}
              onValueChange={(id) => id && onPermissionMode(id as PermissionMode)}
              variant="outline"
              size="sm"
              className="rounded-full bg-card p-1"
            >
              {PERMISSION_MODES.map((option) => (
                <ToggleGroupItem
                  key={option.id}
                  value={option.id}
                  className="rounded-full border-transparent px-4"
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <FieldDescription>{hintOf(PERMISSION_MODES, permissionMode)}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel className="text-muted-foreground">Model</FieldLabel>
          <div>
            <ToggleGroup
              type="single"
              value={model}
              onValueChange={(id) => id && onModel(id as ModelChoice)}
              variant="outline"
              size="sm"
              className="rounded-full bg-card p-1"
            >
              {MODELS.map((option) => (
                <ToggleGroupItem
                  key={option.id}
                  value={option.id}
                  className="rounded-full border-transparent px-4"
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <FieldDescription>{hintOf(MODELS, model)}</FieldDescription>
        </Field>

        <Field orientation="horizontal" className="rounded-2xl bg-card p-4">
          <FieldContent>
            <FieldLabel htmlFor="only-ours">Who can be called</FieldLabel>
            <FieldDescription>
              {ourAgentCount === 0
                ? 'No teammates yet, so nothing is locked'
                : onlyOurAgents
                  ? `Only the ${ourAgentCount} teammates created in Zetrem can be called. Applies from the next session`
                  : 'Any agent Claude Code knows can be called'}
            </FieldDescription>
          </FieldContent>
          <Switch
            id="only-ours"
            checked={onlyOurAgents}
            onCheckedChange={onOnlyOurAgents}
            disabled={ourAgentCount === 0}
          />
        </Field>
      </FieldGroup>

      {notice !== null && (
        <Alert variant="destructive" data-notice>
          <AlertTitle>{notice.what}</AlertTitle>
          <AlertDescription>{notice.why}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {!canStart && (
          <span className="mr-auto text-sm text-muted-foreground">
            Set your account and project first
          </span>
        )}
        {reopened && (
          <Button variant="ghost" onClick={onCancel} className="rounded-full">
            Cancel
          </Button>
        )}
        <Button onClick={onStart} disabled={!canStart} className="rounded-full">
          {reopened ? 'Done' : 'Start'}
        </Button>
      </div>
      </div>
    </div>
  )
}

function hintOf(options: { id: string; hint: string }[], selected: string): string {
  return options.find((option) => option.id === selected)?.hint ?? ''
}
