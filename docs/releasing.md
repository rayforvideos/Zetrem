# Releasing

What you need when cutting a release. Building and running the app from a
checkout is covered in the README.

## Signing

**macOS.** `electron-builder` signs whenever a Developer ID certificate is in the
keychain. Notarising is the normal path now: the credentials live in the
maintainer's login keychain as a notarytool profile named `zetrem`, so a build
is just `APPLE_KEYCHAIN_PROFILE=zetrem npm run package:mac`. The three env vars
(`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`) still work too, if
you ever need to notarise from a machine without that profile. Set `CSC_NAME`
if the keychain holds more than one certificate.

Skipping notarisation matters more than it used to. On macOS 15 and later,
right-clicking an un-notarized download no longer opens it — Gatekeeper just
says "Apple could not verify \[app] is free of malware" with no bypass in the
menu. Getting past that needs System Settings → Privacy & Security → Open
Anyway. So a build without notarisation is only really usable on the machine
that made it.

**Windows.** Not signed yet. Buying a certificate would not remove the first-run
warning right away, because SmartScreen also considers how many people have run
the build, so a newly issued certificate still triggers it. Worth buying once
downloads are high enough for the warning to matter.

## What to say in the release notes

Downloading a Windows build shows a SmartScreen warning, "Windows protected your
PC". Choosing **More info** and then **Run anyway** gets past it. Include that in
the notes: without an explanation, the warning makes people distrust the
download.

—— 한국어 ——

# 배포하기

릴리스를 만들 때 필요한 내용을 정리했다. 소스를 받아 빌드하거나 실행하는
방법은 README 에 있다.

## 서명

**macOS.** 키체인에 Developer ID 인증서가 있으면 `electron-builder` 가 자동으로
서명한다. 이제는 공증이 기본 경로다. 자격 증명은 메인테이너 로그인 키체인에
`zetrem` 이라는 notarytool 프로필로 저장돼 있어서, 빌드할 때는
`APPLE_KEYCHAIN_PROFILE=zetrem npm run package:mac` 만 실행하면 된다. `APPLE_ID`,
`APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` 세 환경 변수도 그대로 쓸 수 있다.
이 프로필이 없는 컴퓨터에서 공증해야 할 때 쓰면 된다. 인증서가 여러 개면
`CSC_NAME` 으로 지정한다.

공증을 건너뛰면 예전보다 문제가 커진다. macOS 15부터는 공증 안 된 다운로드를
오른쪽 클릭으로 열 수 없다. Gatekeeper 가 "Apple이 \[앱]에 악성 코드가 없는지
확인할 수 없습니다" 라는 메시지만 띄우고, 메뉴에 우회할 방법이 없다. 열려면
시스템 설정 → 개인정보 보호 및 보안 → 확인 없이 열기 로 들어가야 한다. 그래서
공증하지 않은 빌드는 사실상 빌드한 그 컴퓨터에서만 쓸 수 있다.

**Windows.** 아직 서명하지 않았다. 인증서를 사도 첫 실행 경고가 바로 없어지지는
않는다. SmartScreen 은 해당 빌드를 실행한 사용자 수도 함께 보기 때문에, 새로 발급
받은 인증서로 서명해도 경고가 뜬다. 다운로드가 늘어서 경고가 실제로 문제가 될 때
구매하는 편이 낫다.

## 릴리스 노트에 적을 것

Windows 빌드를 다운로드하면 SmartScreen 이 "Windows에서 PC를 보호했습니다"
경고를 띄운다. **추가 정보** 를 누르고 **실행** 을 선택하면 넘어간다. 이 안내를
릴리스 노트에 적어 두는 게 좋다. 설명이 없으면 사용자가 다운로드를 의심하게
된다.
