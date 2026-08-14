# 환경 격리 — 두 앱은 아예 별개다

- 작성일: 2026-08-13
- 계기: "Zetrem 에서 작업이 끝났는데 Orca 에서 알림이 온다"

## 진단

`~/.claude/settings.json`(사용자 전역)에 Orca 가 훅 11개를 심어 뒀다 (`Stop`·`SubagentStop`·
`PermissionRequest` 등). 훅은 `~/.orca/agent-hooks/claude-hook.sh` 를 실행하고, 그 스크립트는
이벤트를 Orca 의 로컬 서버(실측: `127.0.0.1:62929`, Orca PID 73366 이 LISTEN)로 POST 한다.

그 훅은 **조건부로 꺼진다** — `ORCA_AGENT_HOOK_PORT`·`ORCA_AGENT_HOOK_TOKEN`·`ORCA_PANE_KEY`
가 없으면 즉시 종료한다. 문제는 그 세 변수가 Zetrem 을 거쳐 그대로 전달됐다는 것이다.
Orca 안의 셸에서 앱을 띄우면 `ORCA_*` 19개가 앱에 상속되고, 앱이 claude 를 spawn 할 때
물려줬다. macOS 설정 문제가 아니라 **환경 상속 문제**다.

## 전면 점검 — 82개를 훑어보니 ORCA 만이 아니었다

| 새던 것 | 무엇을 망가뜨리나 |
|---|---|
| `ORCA_*` 19개 | 남의 앱 훅이 발동, 알림이 그쪽에서 뜬다 |
| `AI_AGENT`, `TERM_PROGRAM=Orca`, `__CFBundleIdentifier` | 남의 앱 정체가 그대로 전달된다 |
| `CODEX_HOME`, `OPENCODE_CONFIG_DIR` | 다른 에이전트의 설정 디렉토리를 쓰게 된다 |
| **`PYENV_VERSION=2.7.18`**, `NVM_BIN`, `SDKMAN_DIR`, `JAVA_HOME` | **에이전트가 쓸 도구가 바뀐다** — `python` 이 2.7 이 된다 |
| `ZDOTDIR`, `FORCE_HYPERLINK`, `MallocNanoZone` | 남의 셸 설정과 런타임 조정이 딸려온다 |

## 수정 — 금지 목록에서 허용 목록으로

금지 목록(`CLAUDE_*` 만 제거)은 **다음 침입자를 늘 놓친다.** 실제로 놓쳤다. 그래서
`agentEnv` 는 아는 것만 통과시킨다:

- 남긴다: `HOME`·`USER`·`LOGNAME`·`SHELL`·`PATH`·`TMPDIR`·`LANG`/`LC_*`·`SSH_AUTH_SOCK`·
  `COMMAND_MODE`·`__CF_USER_TEXT_ENCODING`, 그리고 `ANTHROPIC_*`·프록시(대소문자 무관)
- 우리가 얹는다: `GIT_EDITOR=true`(편집기가 열려 멈추지 않게), `ZETREM=1`
- 나머지는 전부 버린다. 모르는 변수는 통과하지 않는다 — 다음에 어떤 도구가 무엇을 심든 그대로다

## PATH 는 로그인 셸에게 묻는다

허용 목록으로 PATH 를 물려받으면 "어디서 띄웠는가" 가 여전히 결과를 바꾼다 — Finder 로 띄운
GUI 앱의 PATH 는 `/usr/bin:/bin` 수준이라 `claude` 조차 없다. 그래서 사람의 로그인 셸에게
한 번 물어 캐시한다(`$SHELL -ilc 'printf %s "$PATH"'`).

- **`-i` 가 필요하다**: 사람들이 PATH 를 `.zshrc`(대화형 설정)에 쓴다. `-l` 만 주면
  nvm·pyenv·전역 npm 이 빠지고, 실측에서 그렇게 해서 "claude 명령을 찾지 못했습니다" 가 떴다
- 물어본 PATH 로 `claude` 를 실제로 찾을 수 있는지 확인하고, 못 찾으면 물려받은 쪽으로 되돌린다
- 셸에게도 깨끗한 환경을 준다 (`HOME`·`SHELL`·`TERM=dumb`) — 남의 `ZDOTDIR` 로 남의 설정을
  읽으면 이 격리가 그 자리에서 무너진다

## 검증 (실기)

앱이 띄운 에이전트에게 자기 환경을 물었다 (`env | grep -E "^(ORCA|CLAUDE|AI_AGENT|
TERM_PROGRAM|PYENV|NVM|SDKMAN|CODEX|OPENCODE)"`):

> ORCA / TERM_PROGRAM / PYENV / NVM / SDKMAN / CODEX / OPENCODE 접두사는 **하나도 잡히지 않았다.**

남아 있는 `CLAUDE_*`·`AI_AGENT` 는 **우리가 띄운 claude 가 자기 자식에게 스스로 붙인 것**이다
(그것이 Claude Code 가 하는 일이다). 물려받은 것이 아니다.

## 남는 사실 — 이건 격리가 아니라 사용자의 설정이다

`~/.claude/settings.json` 은 여전히 읽힌다. 훅도 등록되지만 ORCA 변수가 없어 즉시 종료하므로
알림은 뜨지 않는다. 사용자의 모델 선호·CLAUDE.md·플러그인이 그대로 사는 것은 의도한 것이다 —
그것까지 끊으려면 `--setting-sources project,local` 이지만, 그건 사용자의 설정을 빼앗는 일이다.
