<div align="center">

<img src="docs/media/hero.png" alt="Zetrem: three teammates working on one question" width="820" />

<h1>Zetrem</h1>

<p><strong>Claude Code, given a screen.</strong><br/>
Hand work to named teammates, watch what each of them is doing, and approve the
moments that need you, without reading a terminal.</p>

<p>
  <a href="https://github.com/rayforvideos/Zetrem/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/rayforvideos/Zetrem/ci.yml?branch=master&style=for-the-badge&label=CI" alt="CI status"></a>
  <a href="https://github.com/rayforvideos/Zetrem/releases"><img src="https://img.shields.io/badge/status-beta-orange?style=for-the-badge" alt="Beta"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="MIT licence"></a>
  <img src="https://img.shields.io/badge/platform-macOS-black?style=for-the-badge&logo=apple&logoColor=white" alt="macOS">
</p>

<p>
  <a href="#what-it-is">What it is</a> ·
  <a href="#running-it">Running it</a> ·
  <a href="#how-it-fits-together">Architecture</a> ·
  <a href="CONTRIBUTING.md">Contributing</a> ·
  <a href="#한국어">한국어</a>
</p>

</div>

---

> **Beta.** It is used daily by the person who wrote it, and the tests are real,
> but it has not been through many other hands yet.

---

## What it is

Claude Code is the engine; Zetrem owns the screen. The CLI does the work,
unchanged. Zetrem passes it no persona, no style rules and no instructions of
its own, so an answer here is the answer you would get in a terminal.

The screen answers three questions and nothing else:

- who is doing what right now
- what has been done
- what needs my decision

### A teammate is a brief you write once

<div align="center">
<img src="docs/media/teammate.png" alt="Writing a teammate: a name, when to call them, and their standing brief" width="740" />
</div>

Name them, say when they should be called, and write their standing
instructions. The orchestrator reads that middle line to decide who gets the
job. Teammates live with you, not with a project, so they are there in every
folder you open.

## Running it

You need the [Claude Code](https://claude.com/claude-code) CLI on your `PATH`
and signed in, and Node 20.19 or newer.

```bash
npm install
npm run dev
```

On first launch, pick an account and a project folder, choose how far agents may
go without asking, and start.

## Building

```bash
npm run package:mac     # .app in release/
npm run package:win     # NSIS installer in release/
```

macOS is the platform this is developed and released on. A Windows target is
configured and the platform-specific paths are handled, but no Windows build has
been tested yet. Reports welcome.

Signing happens automatically when a Developer ID certificate is in your
keychain. Set `CSC_NAME` if you have more than one.

## How it fits together

```
electron/     main process. Spawns the CLI, owns the filesystem and IPC
src/app       composition root and the IPC contract
src/pages     screens
src/widgets   composed blocks
src/entities  domain concepts
src/shared    things with no domain knowledge
```

The renderer never touches Node. Everything it needs crosses a narrow,
sender-checked IPC bridge defined in `src/app/api/desk.ts`.

Rules this repo holds itself to live in `tests/conventions/`. Folder layout,
where types go, that the UI says nothing in Korean outside the dictionary, that
the main process compiles no translation macro, and that commits name their
kind. `npm test` tells you which one you broke.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md), then open an issue or a pull request.
Translations into a new language are the easiest place to start:
[docs/translating.md](docs/translating.md).

## Licence

[MIT](LICENSE). © 2026 Sangjun Park.

Zetrem does not bundle Claude Code; it runs the one you installed, under
Anthropic's terms with you.

---

<a name="한국어"></a>

# 한국어

**Claude Code 에 화면을 준 것.** 이름 있는 팀원에게 일을 맡기고, 각자 무엇을
하고 있는지 보고, 결정이 필요한 순간에만 손을 댄다. 터미널을 읽지 않고.

## 무엇인가

엔진은 Claude Code 이고 화면은 Zetrem 이 갖는다. 일은 CLI 가 그대로 한다.
Zetrem 은 페르소나도, 말투 규칙도, 자기 지시도 넘기지 않는다. 그래서 여기서
받은 답은 터미널에서 받았을 답과 같다.

화면은 셋만 답한다.

- 지금 누가 무엇을 하고 있나
- 여태 무엇이 되었나
- 내가 지금 결정할 것이 있나

### 팀원은 한 번 써 두는 지시문이다

이름을 주고, 언제 부를지 적고, 늘 지킬 지시를 쓴다. 오케스트레이터는 가운데
줄을 읽고 누구에게 맡길지 정한다. 팀원은 프로젝트가 아니라 당신에게 붙어
있어서, 어느 폴더를 열든 거기 있다.

## 띄우기

`PATH` 에 로그인된 [Claude Code](https://claude.com/claude-code) CLI 와
Node 20.19 이상이 필요하다.

```bash
npm install
npm run dev
```

처음 켜면 계정과 프로젝트 폴더를 고르고, 에이전트가 묻지 않고 어디까지 해도
되는지 정한 뒤 시작한다.

## 빌드

```bash
npm run package:mac     # release/ 에 .app
npm run package:win     # release/ 에 NSIS 설치본
```

macOS 에서 개발하고 배포한다. Windows 타깃은 설정해 두었고 플랫폼별 경로도
처리하지만, Windows 빌드를 실제로 해 본 적은 없다. 제보를 환영한다.

키체인에 Developer ID 인증서가 있으면 서명은 자동으로 붙는다. 인증서가 여럿이면
`CSC_NAME` 을 지정하면 된다.

## 구조

```
electron/     메인 프로세스. CLI 를 띄우고 파일시스템과 IPC 를 쥔다
src/app       조립 지점과 IPC 계약
src/pages     화면
src/widgets   조합된 덩어리
src/entities  도메인 개념
src/shared    도메인을 모르는 것들
```

렌더러는 Node 를 만지지 않는다. 필요한 것은 전부 `src/app/api/desk.ts` 에
정의된, 보낸 쪽을 검사하는 좁은 IPC 다리를 건넌다.

이 저장소가 스스로에게 지우는 규칙은 `tests/conventions/` 에 있다. 폴더 배치,
타입이 있을 자리, 사전 밖에서 한국어를 쓰지 않을 것, 메인 프로세스가 번역
매크로를 컴파일하지 않을 것, 커밋이 종류를 밝힐 것. 어기면 `npm test` 가
어느 것인지 말한다.

## 기여

[CONTRIBUTING.md](CONTRIBUTING.md) 를 읽고 이슈나 PR 을 열면 된다. 새 언어
번역이 가장 시작하기 쉽다: [docs/translating.md](docs/translating.md).

## 라이선스

[MIT](LICENSE). © 2026 Sangjun Park.

Zetrem 은 Claude Code 를 번들하지 않는다. 당신이 설치한 것을 실행하며, 그쪽
약관은 Anthropic 과 당신 사이에 있다.
