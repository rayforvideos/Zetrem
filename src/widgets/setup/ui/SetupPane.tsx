import type { CSSProperties } from 'react'
import { MODELS, PERMISSION_MODES } from '@/entities/agent-session'
import type { ModelChoice, PermissionMode } from '@/entities/agent-session'
import type { AuthStatus } from '@/shared/api/desk'
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
  onStart(): void
  /** 로그인과 프로젝트가 모두 갖춰졌는가 — 아니면 시작 버튼이 잠긴다 */
  canStart: boolean
  loggingIn: boolean
  /** 로그인 중 CLI 가 내는 안내 (브라우저가 안 열릴 때 붙일 URL) */
  loginNote: string
}

/**
 * 첫 화면 — 일을 맡기기 전에 지나는 문.
 *
 * 셋을 묻는다: 누구로 일하는가(로그인), 어디서 일하는가(프로젝트), 어디까지 맡기는가(권한).
 * 앞의 둘이 없으면 에이전트는 시작조차 못 하고, 셋째는 사람이 정해야 하는 것이다 —
 * "전부 허용" 은 편해서가 아니라 그 사람이 그렇게 정했기 때문에 켜져야 한다.
 */
export function SetupPane({
  auth,
  project,
  permissionMode,
  model,
  onLogin,
  onPickProject,
  onPermissionMode,
  onModel,
  onStart,
  canStart,
  loggingIn,
  loginNote,
}: SetupPaneProps) {
  return (
    <div style={rootStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* 처음 켠 사람이 무엇을 켰는지 아는 순간 — 배경 사진과 겨룰 다른 글자가 없으니 가장 크게 선다 */}
        <Wordmark width={WORDMARK_SIZE.setup} />
        <h1 style={titleStyle}>시작하기 전에</h1>
      </div>

      <ol style={stepsStyle}>
        <li style={stepStyle}>
          <div style={stepHeadStyle}>
            <span style={markStyle(auth?.loggedIn === true)}>{auth?.loggedIn ? '✓' : '1'}</span>
            <span style={stepTitleStyle}>계정</span>
          </div>
          {auth?.missing ? (
            <div style={noteStyle}>
              <code>claude</code> 명령을 찾지 못했습니다. Claude Code 를 설치한 뒤 앱을 다시
              여세요.
            </div>
          ) : auth?.loggedIn ? (
            <div style={noteStyle}>
              {auth.email}
              {auth.orgName ? ` · ${auth.orgName}` : ''}
            </div>
          ) : (
            <div style={rowStyle}>
              <button
                type="button"
                onClick={onLogin}
                className="zt-btn zt-btn--primary zt-btn--sm"
                disabled={loggingIn}
              >
                {loggingIn ? '브라우저에서 로그인 중…' : 'Anthropic 계정으로 로그인'}
              </button>
              {loginNote.length > 0 && <code style={loginNoteStyle}>{loginNote}</code>}
            </div>
          )}
        </li>

        <li style={stepStyle}>
          <div style={stepHeadStyle}>
            <span style={markStyle(project !== null)}>{project ? '✓' : '2'}</span>
            <span style={stepTitleStyle}>일할 프로젝트</span>
          </div>
          <div style={rowStyle}>
            <button type="button" onClick={onPickProject} className="zt-btn zt-btn--sm">
              {project ? '다른 폴더 고르기' : '폴더 고르기'}
            </button>
            {project && <code style={loginNoteStyle}>{project.path}</code>}
          </div>
        </li>

        <li style={stepStyle}>
          <div style={stepHeadStyle}>
            <span style={markStyle(true)}>3</span>
            <span style={stepTitleStyle}>어디까지 맡길까요</span>
          </div>
          <Choices
            options={PERMISSION_MODES}
            selected={permissionMode}
            onSelect={(id) => onPermissionMode(id as PermissionMode)}
          />
        </li>

        <li style={stepStyle}>
          <div style={stepHeadStyle}>
            <span style={markStyle(true)}>4</span>
            <span style={stepTitleStyle}>어떤 모델로</span>
          </div>
          {/* 비용·속도·품질을 한 번에 정하는 선택이다 — 서랍에 넣어둘 것이 아니다 */}
          <Choices
            options={MODELS}
            selected={model}
            onSelect={(id) => onModel(id as ModelChoice)}
          />
        </li>
      </ol>

      <div style={startStyle}>
        <button
          type="button"
          onClick={onStart}
          className="zt-btn zt-btn--primary"
          disabled={!canStart}
          title={canStart ? undefined : '계정과 프로젝트가 있어야 시작할 수 있습니다'}
        >
          이 설정으로 시작
        </button>
        {!canStart && <span style={noteStyle}>계정과 프로젝트를 먼저 정해주세요</span>}
      </div>

    </div>
  )
}

/**
 * 고르는 자리 — 보기들이 한 줄로 서고, 고른 것의 설명이 그 아래 한 줄로 남는다.
 * 설명을 툴팁에만 두면 마우스를 올리기 전에는 무엇을 정하는지 모른다.
 */
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
    <>
      <div style={choicesStyle}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={`zt-btn zt-btn--sm${selected === option.id ? ' zt-btn--primary' : ''}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div style={noteStyle}>{options.find((option) => option.id === selected)?.hint}</div>
    </>
  )
}

/** 끝난 단계는 체크, 남은 단계는 번호 — 색을 들이지 않고 형태로만 가른다 */
function markStyle(done: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    borderRadius: 9,
    fontSize: 10.5,
    fontWeight: 600,
    border: '1px solid currentColor',
    background: done ? 'color-mix(in srgb, currentColor 14%, transparent)' : 'transparent',
  }
}

const rootStyle: CSSProperties = {
  position: 'relative',
  zIndex: 3,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 22,
  maxWidth: 560,
}

const titleStyle: CSSProperties = {
  fontFamily: 'var(--zt-serif)',
  fontSize: 30,
  fontWeight: 500,
  letterSpacing: '-0.02em',
}

const stepsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  listStyle: 'none',
}

const stepStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 }

const stepHeadStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 }

const stepTitleStyle: CSSProperties = { fontSize: 13, fontWeight: 600 }

const rowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }

const choicesStyle: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' }

const noteStyle: CSSProperties = { fontSize: 12.5, lineHeight: 1.5 }

const loginNoteStyle: CSSProperties = {
  fontSize: 11.5,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  overflowWrap: 'anywhere',
}

const startStyle: CSSProperties = { marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 12 }


