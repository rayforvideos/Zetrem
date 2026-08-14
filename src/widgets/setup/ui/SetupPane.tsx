import type { ReactNode } from 'react'
import { MODELS, PERMISSION_MODES } from '@/entities/agent-session'
import type { ModelChoice, PermissionMode } from '@/entities/agent-session'
import type { AuthStatus } from '@/shared/api/desk'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/cn'
import { WORDMARK_SIZE, Wordmark } from '@/shared/ui/wordmark'

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
  canStart: boolean
  loggingIn: boolean
  loginNote: string
}

const LOCK_CHOICES = [
  { id: 'ours', label: 'Zetrem 이 들인 사람만', hint: '' },
  { id: 'all', label: '엔진이 아는 사람 전부', hint: '' },
]

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
  canStart,
  loggingIn,
  loginNote,
}: SetupPaneProps) {
  return (
    <div className="relative z-[3] mx-auto flex h-full w-full max-w-[560px] flex-col justify-center gap-9 py-6">
      <div className="flex flex-col gap-4">
        <Wordmark width={WORDMARK_SIZE.setup} />
        <p className="max-w-[380px] text-[12.5px] leading-relaxed opacity-45">
          Claude Code 를 뒤에서 굴리고, 그 일을 여기에 펼칩니다.
        </p>
      </div>

      <div className="flex flex-col">
        <Row label="계정" done={auth?.loggedIn === true}>
          {auth?.missing ? (
            <span className="opacity-70">
              <code className="font-mono">claude</code> 명령을 찾지 못했습니다. 설치한 뒤 다시
              열어주세요.
            </span>
          ) : auth?.loggedIn ? (
            <span>
              {auth.email}
              {auth.orgName && <span className="opacity-45"> · {auth.orgName}</span>}
            </span>
          ) : (
            <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <Action onClick={onLogin} disabled={loggingIn}>
                {loggingIn ? '브라우저에서 로그인 중…' : 'Anthropic 계정으로 로그인'}
              </Action>
              {loginNote && <code className="font-mono text-[11px] opacity-45">{loginNote}</code>}
            </span>
          )}
        </Row>

        <Row label="프로젝트" done={project !== null}>
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {project && <span className="font-mono text-[12.5px]">{project.path}</span>}
            <Action onClick={onPickProject}>{project ? '바꾸기' : '폴더 고르기'}</Action>
          </span>
        </Row>

        <Row label="어디까지" hint={hintOf(PERMISSION_MODES, permissionMode)}>
          <Choices
            options={PERMISSION_MODES}
            selected={permissionMode}
            onSelect={(id) => onPermissionMode(id as PermissionMode)}
          />
        </Row>

        <Row
          label="부를 사람"
          hint={
            ourAgentCount === 0
              ? '아직 들인 사람이 없어 잠기지 않습니다'
              : onlyOurAgents
                ? `Zetrem 이 들인 ${ourAgentCount}명만 부릅니다. 다음 세션부터 적용됩니다`
                : 'Claude Code 가 아는 모든 에이전트를 부를 수 있습니다'
          }
        >
          <Choices
            options={LOCK_CHOICES}
            selected={onlyOurAgents ? 'ours' : 'all'}
            onSelect={(id) => onOnlyOurAgents(id === 'ours')}
          />
        </Row>

        <Row label="모델" hint={hintOf(MODELS, model)}>
          <Choices options={MODELS} selected={model} onSelect={(id) => onModel(id as ModelChoice)} />
        </Row>
      </div>

      <div className="flex items-baseline gap-4">
        <Button onClick={onStart} disabled={!canStart} className="text-[12.5px]">
          이 설정으로 시작
        </Button>
        {!canStart && (
          <span className="text-[12.5px] opacity-45">계정과 프로젝트를 먼저 정해주세요</span>
        )}
      </div>
    </div>
  )
}

function Row({
  label,
  done,
  hint,
  children,
}: {
  label: string
  done?: boolean
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="flex items-baseline gap-5 border-t border-current/15 py-3.5 first:border-t-0">
      <span className="w-[68px] flex-none text-[12.5px] opacity-45">{label}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="text-[12.5px]">{children}</div>
        {hint && <div className="text-[12.5px] opacity-45">{hint}</div>}
      </div>
      {done !== undefined && (
        <span className={cn('flex-none text-[12.5px]', done ? 'opacity-70' : 'opacity-0')}>✓</span>
      )}
    </div>
  )
}

function Choices({
  options,
  selected,
  onSelect,
}: {
  options: { id: string; label: string; hint: string }[]
  selected: string
  onSelect(id: string): void
}) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-1">
      {options.map((option, index) => (
        <span key={option.id} className="flex items-baseline">
          {index > 0 && <span className="px-1.5 opacity-15">·</span>}
          <Button
            variant="quiet"
            size="bare"
            onClick={() => onSelect(option.id)}
            className={cn(
              'underline-offset-4',
              option.id === selected && 'font-medium underline opacity-100',
            )}
          >
            {option.label}
          </Button>
        </span>
      ))}
    </span>
  )
}

function Action({
  onClick,
  disabled,
  children,
}: {
  onClick(): void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <Button
      variant="quiet"
      size="bare"
      onClick={onClick}
      disabled={disabled}
      className="underline decoration-current/30 underline-offset-4 opacity-100 hover:decoration-current"
    >
      {children}
    </Button>
  )
}

function hintOf(options: { id: string; hint: string }[], selected: string): string {
  return options.find((option) => option.id === selected)?.hint ?? ''
}
