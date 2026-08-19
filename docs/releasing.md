# Releasing

What you need when cutting a release. Building and running the app from a
checkout is covered in the README.

## Signing

**macOS.** `electron-builder` signs whenever a Developer ID certificate is in the
keychain, and notarises when Apple's credentials are in the environment:
`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`. Without them the
build still produces a signed dmg and zip, which open with a right click on the
machine that built them. Set `CSC_NAME` if the keychain holds more than one
certificate.

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
서명한다. 공증은 `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` 가
환경 변수로 있을 때만 실행된다. 없어도 서명된 dmg 와 zip 은 만들어지고, 빌드한
컴퓨터에서는 오른쪽 클릭으로 열 수 있다. 인증서가 여러 개면 `CSC_NAME` 으로
지정한다.

**Windows.** 아직 서명하지 않았다. 인증서를 사도 첫 실행 경고가 바로 없어지지는
않는다. SmartScreen 은 해당 빌드를 실행한 사용자 수도 함께 보기 때문에, 새로 발급
받은 인증서로 서명해도 경고가 뜬다. 다운로드가 늘어서 경고가 실제로 문제가 될 때
구매하는 편이 낫다.

## 릴리스 노트에 적을 것

Windows 빌드를 다운로드하면 SmartScreen 이 "Windows에서 PC를 보호했습니다"
경고를 띄운다. **추가 정보** 를 누르고 **실행** 을 선택하면 넘어간다. 이 안내를
릴리스 노트에 적어 두는 게 좋다. 설명이 없으면 사용자가 다운로드를 의심하게
된다.
