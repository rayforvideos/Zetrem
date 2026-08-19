# Security

## Reporting

Please do not open a public issue. Use GitHub's private advisory form:
[Report a vulnerability](https://github.com/rayforvideos/Zetrem/security/advisories/new).

You will get an answer within a week. If a fix is needed, you will hear how it
is going until it ships, and you will be credited in the release notes unless
you would rather not be.

## What the app has access to

Worth knowing when judging whether something is a Zetrem problem:

- **Zetrem does not bundle Claude Code.** It runs whatever `claude` is on your
  `PATH`, so a vulnerability in the CLI itself belongs to
  [Anthropic](https://github.com/anthropics/claude-code/security).
- **Signing in is the CLI's.** Zetrem calls `claude auth`; it never sees or
  stores your credentials. Signing out clears the machine-wide keychain entry,
  which signs out every Claude Code on that computer, not only this app.
- **Agents run with your permissions.** The permission mode you pick decides how
  much they do without asking, and "Allow all" passes
  `--dangerously-skip-permissions` to the CLI.
- **Your work stays local.** Conversations, teammates and settings are written
  under the app's own directory. Zetrem sends nothing anywhere except through
  the CLI you already run.

## Out of scope

An agent doing something destructive that you approved, and anything that
assumes an attacker already controls your machine or your keychain.

—— 한국어 ——

# 보안

## 신고

공개 이슈로 올리지 마세요. GitHub 의 비공개 신고 양식을 써 주세요:
[취약점 신고하기](https://github.com/rayforvideos/Zetrem/security/advisories/new).

일주일 안에 답변드립니다. 수정이 필요하면 배포될 때까지 진행 상황을 알려드리고,
원하지 않으시면 빼드리되 기본적으로 릴리스 노트에 이름을 남깁니다.

## 이 앱이 접근하는 것

Zetrem 쪽 문제인지 판단할 때 참고할 내용입니다.

- **Zetrem 은 Claude Code 를 포함해서 배포하지 않습니다.** `PATH` 에 있는
  `claude` 를 실행하므로, CLI 자체의 취약점은
  [Anthropic](https://github.com/anthropics/claude-code/security) 에 신고해 주세요.
- **로그인은 CLI 가 처리합니다.** Zetrem 은 `claude auth` 를 실행할 뿐이고 자격
  증명을 읽거나 저장하지 않습니다. 로그아웃하면 시스템 키체인 항목이 지워지므로,
  이 앱뿐 아니라 그 컴퓨터의 모든 Claude Code 가 로그아웃됩니다.
- **에이전트는 사용자 권한으로 실행됩니다.** 선택한 권한 모드가 확인 없이 할 수
  있는 범위를 정합니다. "전부 허용" 은 CLI 에 `--dangerously-skip-permissions` 를
  전달합니다.
- **데이터는 로컬에 저장됩니다.** 대화·팀원·설정은 앱 데이터 디렉터리에
  기록됩니다. Zetrem 이 직접 외부로 보내는 것은 없고, 통신은 모두 사용자가 실행한
  CLI 를 거칩니다.

## 범위 밖

사용자가 승인한 에이전트가 파괴적인 동작을 한 경우, 그리고 공격자가 이미 그
컴퓨터나 키체인을 장악한 상태를 전제하는 경우는 대상이 아닙니다.
