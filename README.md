# Zetrem

A desktop app for running a team of Claude Code agents.

Claude Code is the engine; Zetrem owns the screen. You hand work to named
teammates, watch what each of them is doing, and approve the moments that need
a decision, without reading a terminal.

The screen answers three questions and nothing else:

- who is doing what right now
- what has been done
- what needs my decision

## Requirements

- The [Claude Code](https://claude.com/claude-code) CLI on your `PATH`, signed in
- Node 22 (see `.nvmrc`)
- macOS or Windows

## Running it

```bash
npm install
npm run dev
```

On first launch, pick an Anthropic account and a project folder, choose how far
agents may go without asking, and start.

## Building

```bash
npm run package:mac     # .app in release/
npm run package:win     # NSIS installer in release/
```

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

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md). The rules there are enforced by tests
in `tests/conventions/`, so `npm test` will tell you if you broke one.

---

# Zetrem

Claude Code 에이전트 팀을 부리는 데스크톱 앱.

엔진은 Claude Code 이고 화면은 Zetrem 이 갖는다. 이름 있는 팀원에게 일을 맡기고,
각자 무엇을 하고 있는지 보고, 결정이 필요한 순간에 결재한다. 터미널을 읽지 않고.

화면은 셋만 답한다.

- 지금 누가 무엇을 하고 있나
- 여태 무엇이 되었나
- 내가 지금 결정할 것이 있나

## 준비물

- `PATH` 에 있고 로그인된 [Claude Code](https://claude.com/claude-code) CLI
- Node 22 (`.nvmrc` 참고)
- macOS 또는 Windows

## 띄우기

```bash
npm install
npm run dev
```

처음 켜면 Anthropic 계정과 프로젝트 폴더를 고르고, 에이전트가 묻지 않고 어디까지
할 수 있는지 정한 뒤 시작한다.

## 빌드

```bash
npm run package:mac     # release/ 에 .app
npm run package:win     # release/ 에 NSIS 설치본
```

## 구조

```
electron/     메인 프로세스. CLI 를 띄우고 파일과 IPC 를 쥔다
src/app       조립 지점과 IPC 계약
src/pages     화면
src/widgets   화면이 배치하는 덩어리
src/entities  도메인 개념
src/shared    도메인을 모르는 것들
```

렌더러는 Node 에 닿지 않는다. 필요한 것은 전부 `src/app/api/desk.ts` 에 정의된
좁고 발신자를 확인하는 IPC 다리를 건넌다.

## 기여

[CONTRIBUTING.md](./CONTRIBUTING.md) 를 읽어달라. 거기 적힌 규칙은
`tests/conventions/` 의 테스트가 지키므로, 어기면 `npm test` 가 알려준다.
