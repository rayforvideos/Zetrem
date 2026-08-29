<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/media/wordmark-dark.png">
  <img src="docs/media/wordmark-light.png" alt="Zetrem" width="340">
</picture>

<p>Claude Code 에이전트 팀을 화면에서 다루는 데스크톱 앱. 이름을 붙인 팀원에게
일을 맡기고, 각자 무엇을 하는지 보고, 승인이 필요할 때 답한다. 실제 작업은
Claude Code CLI 가 그대로 처리한다.</p>

<p>
  <a href="https://github.com/rayforvideos/Zetrem/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/rayforvideos/Zetrem/ci.yml?branch=master&style=for-the-badge&label=CI" alt="CI status"></a>
  <a href="https://github.com/rayforvideos/Zetrem/releases"><img src="https://img.shields.io/badge/status-beta-orange?style=for-the-badge" alt="Beta"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="MIT licence"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-black?style=for-the-badge" alt="macOS and Windows">
</p>

<p align="center">
  <strong>
    <a href="#왜-zetrem-인가">왜 Zetrem 인가</a> ·
    <a href="#실행하기">실행하기</a> ·
    <a href="#동작-방식">동작 방식</a> ·
    <a href="CONTRIBUTING.md">기여</a> ·
    <a href="README.md">English</a>
  </strong>
</p>

<img src="docs/media/demo.webp" alt="Zetrem 한 번의 실행: 팀원을 만들고, 버그 하나를 셋에게 동시에 맡기고, 편집을 승인하고, 각자 무엇을 했는지 읽고, 답을 라이브러리에 담는다" width="820" />

</div>

---

> **베타.** 제작자가 매일 쓰고 릴리스 시점에 두 플랫폼에서 확인하지만, 아직
> 널리 쓰이진 않았다.

---

## 목차

- [왜 Zetrem 인가](#왜-zetrem-인가)
- [실행하기](#실행하기)
- [동작 방식](#동작-방식)
- [팀원 만들기](#팀원-만들기)
- [주요 기능](#주요-기능)
- [빌드](#빌드)
- [구조](#구조)
- [기여](#기여)
- [데이터와 네트워크](#데이터와-네트워크)
- [라이선스](#라이선스)

---

## 왜 Zetrem 인가

Claude Code 는 큰 작업을 여러 서브에이전트로 나눠서 처리한다. 그런데 터미널에는
그 결과가 한 줄기로만 흐른다. 에이전트 셋이 동시에 움직이면 출력이 뒤섞이고, 도구
호출이 끼어들고, 승인을 기다리는 질문도 그 사이에 섞여 지나간다.

Zetrem 은 이 정보를 화면에 나눠서 보여준다.

- 지금 누가 무엇을 하고 있는지
- 지금까지 무엇이 끝났는지
- 승인을 기다리는 것이 있는지

대신 응답 자체에는 손대지 않는다. CLI 에 페르소나나 말투 규칙을 넘기지 않는다.
Zetrem 이 더하는 것은 프로젝트의 라이브러리와 그 쓰는 법 하나뿐이어서, 같은
질문이면 터미널에서 받는 답과 같은 답이, 프로젝트가 이미 아는 것을 바탕으로 나온다.

---

## 실행하기

Node 20.19 이상이 필요하다. [Claude Code](https://claude.com/claude-code) CLI 는
설치된 자리를 찾아 쓰고, 없으면 설정 화면에서 바로 설치할 수 있다. 로그인도
같은 화면에서 한다.

```bash
npm install
npm run dev
```

처음 켜면 계정과 프로젝트 폴더를 고른다. 에이전트가 묻지 않고 어디까지 해도
되는지 정한 뒤 시작한다.

---

## 동작 방식

작업을 요청하면 다음 순서로 진행된다.

1. **Zetrem 이 Claude Code 세션 하나를 띄운다.** 팀원과 프로젝트의 라이브러리를
   함께 알려주고 `stream-json` 출력을 읽는다.
2. **오케스트레이터가 누구에게 줄지 정한다.** 직접 읽고 고치고 실행하거나
   지시문이 맞는 팀원에게 한 조각을 넘긴다.
3. **팀원마다 타일이 생긴다.** 이름, 무엇을 맡았는지, 얼마나 붙들고 있는지,
   지금까지 부른 도구가 거기 있다.
4. **승인이 필요하면 화면에서 묻는다.** 권한 모드에 따라 파일 수정이나 명령
   실행 전에 사용자 응답을 기다린다.
5. **팀원들의 보고를 하나로 정리해 답한다.** 대화는 프로젝트마다 저장되므로
   다시 열면 이어서 진행할 수 있다.
6. **작업이 끝나거나 승인이 필요할 때 알림을 보낸다.** 창이 다른 창 뒤에 있을
   때만.

---

## 팀원 만들기

이름, 언제 부를지, 지시문 세 가지를 적으면 팀원이 만들어진다. 오케스트레이터는
'언제 부를지'를 읽고 누구에게 맡길지 정한다. 팀원은 프로젝트가 아니라 사용자
단위로 저장되므로 어느 폴더에서든 쓸 수 있다.

쓸 도구를 제한하거나, 먼저 읽을 문서를 첨부할 수도 있다. 둘 다 실제로 세션에
전달된다.

---

## 주요 기능

| | |
|---|---|
| **라이브러리** | 프로젝트마다 `.zetrem/library` 아래에 두는 노트. 에이전트는 모른다고 답하기 전에 여기를 찾아보고 알게 된 것을 남긴다. 답변 아래 「라이브러리에」로 답변을 담을 수 있고, 입력창의 스위치로 프로젝트별로 세션에 줄지 정한다. |
| **팀원** | 앱에서 만들고 사용자 단위로 저장된다. 어느 프로젝트에서든 부를 수 있고, 모델·도구·읽을 문서를 각각 지정한다. |
| **빌트인 에이전트** | Claude Code 가 제공하는 에이전트. 개별로 끌 수 있다. |
| **권한 모드** | 먼저 묻기 · 자동 편집(파일은 자유롭게, 명령은 묻고) · 전부 허용. |
| **모델과 노력** | 입력창에서 고르고 다음 세션부터 적용된다. 모델, 그리고 그 아래 Claude Code 의 노력 수준(낮음~최대). |
| **커넥터** | MCP 서버를 앱에서 추가·로그인·삭제한다. |
| **플러그인** | 마켓플레이스를 앱에서 둘러보고 설치한다. |
| **사용량** | 계정 한도를 표시한다. 모델별 한도가 따로 있으면 그것도 함께. |
| **언어** | 영어와 한국어를 지원한다. [추가](docs/translating.md)는 PO 파일 하나다. |

---

## 빌드

```bash
npm run package:mac     # release/ 에 .app
npm run package:win     # release/ 에 NSIS 설치본
```

푸시할 때마다 CI 에서 리눅스 검사를 돌린다. macOS 와 Windows 검사(실행,
패키징, 스모크 테스트)는 릴리스 태그와 수동 실행 때 돈다.

---

## 구조

```
electron/     메인 프로세스. CLI 를 띄우고 파일시스템과 IPC 를 쥔다
src/app       조립 지점과 IPC 계약
src/pages     화면
src/widgets   조합된 덩어리
src/entities  도메인 개념
src/shared    도메인을 모르는 것들
```

렌더러에서는 Node API 를 쓰지 않는다. 필요한 기능은 모두 `src/app/api/desk.ts`
에 정의된 IPC 를 거치며, 이때 요청을 보낸 쪽이 맞는지 확인한다.

프로젝트 규약은 `tests/conventions/` 의 테스트로 강제한다. 폴더 구조, 타입 파일
위치, 사전 밖에서 한국어를 쓰지 않을 것, 메인 프로세스에 번역 매크로가 들어가지
않을 것, 커밋 메시지가 종류를 밝힐 것 등이다. 어기면 `npm test` 가 알려준다.

---

## 기여

[CONTRIBUTING.md](CONTRIBUTING.md) 를 읽고 이슈나 PR 을 열면 된다. 새 언어 번역이
가장 시작하기 쉽다: [docs/translating.md](docs/translating.md).

보안 문제는 [SECURITY.md](SECURITY.md) 를 따라 비공개로 알려주면 된다.

---

## 데이터와 네트워크

수집하는 분석 데이터나 오류 리포트가 없고, 별도 계정도 만들지 않는다. Zetrem 이
직접 보내는 요청은 둘이다. Claude Code 새 버전이 나왔는지 `registry.npmjs.org` 에
조회하고, 자기 업데이트를 GitHub Releases 에서 받는다. 나머지 통신은 모두 사용자가
설치한 CLI 가 사용자 계정으로 처리한다.

대화·팀원·설정은 앱 데이터 디렉터리에 파일로 저장된다. 지운 대화는 그 안의
`trash/` 폴더로 옮겨지고, 바로 삭제되지 않는다. 프로젝트의 라이브러리는 프로젝트
폴더 안 `.zetrem/library` 의 마크다운 파일이어서 폴더와 함께 움직인다. 각 라이브러리는
실행마다 새 토큰을 가진 `127.0.0.1` 의 로컬 MCP 서버로 세션에 전달된다. 로그인과 로그아웃은 CLI 가
관리하므로, 여기서 로그아웃하면 그 컴퓨터의 모든 Claude Code 가 로그아웃된다.

---

## 라이선스

[MIT](LICENSE). © 2026 Sangjun Park.

Zetrem 은 Claude Code 를 포함해서 배포하지 않는다. 사용자가 설치한 CLI 를 실행할
뿐이며, 그 이용 약관은 Anthropic 과 사용자 사이의 것이다.
