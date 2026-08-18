# Security

## Reporting

Please do not open a public issue. Use GitHub's private advisory form:
[Report a vulnerability](https://github.com/rayforvideos/Zetrem/security/advisories/new).

You will get an answer within a week. If a fix is needed, you will hear how it
is going until it ships, and you will be credited in the release notes unless
you would rather not be.

## What this app touches

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
requires an attacker to already control your machine or your keychain.

—— 한국어 ——

# 보안

## 신고

공개 이슈로 올리지 마세요. GitHub 의 비공개 신고 양식을 써 주세요:
[취약점 신고하기](https://github.com/rayforvideos/Zetrem/security/advisories/new).

일주일 안에 답을 드립니다. 고쳐야 하는 것이면 배포될 때까지 진행 상황을
알려드리고, 원치 않으신다고 하지 않는 한 릴리스 노트에 이름을 남깁니다.

## 이 앱이 닿는 것

Zetrem 문제인지 판단할 때 알아두면 좋은 것들입니다.

- **Zetrem 은 Claude Code 를 번들하지 않습니다.** `PATH` 에 있는 `claude` 를
  실행할 뿐이므로, CLI 자체의 취약점은
  [Anthropic](https://github.com/anthropics/claude-code/security) 쪽입니다.
- **로그인은 CLI 의 것입니다.** Zetrem 은 `claude auth` 를 부를 뿐 자격 증명을
  보지도 저장하지도 않습니다. 로그아웃하면 기기 전체 키체인 항목이 지워져서,
  이 앱뿐 아니라 그 컴퓨터의 모든 Claude Code 가 로그아웃됩니다.
- **에이전트는 당신의 권한으로 돕니다.** 고른 권한 모드가 묻지 않고 할 수 있는
  범위를 정하며, "전부 허용" 은 CLI 에 `--dangerously-skip-permissions` 를
  넘깁니다.
- **작업물은 로컬에 남습니다.** 대화와 팀원과 설정은 앱 자기 디렉터리에
  기록됩니다. Zetrem 은 이미 실행 중인 CLI 를 통하지 않고는 아무것도 보내지
  않습니다.

## 범위 밖

당신이 승인한 에이전트의 파괴적인 동작, 그리고 공격자가 이미 당신의 컴퓨터나
키체인을 쥐고 있어야 성립하는 것.
