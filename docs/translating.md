# Translating Zetrem

Zetrem is written in English and reads its other languages from PO
catalogs in `src/shared/locales`. A line nobody has translated shows in
English, so a half-finished language is fine to ship.

## Fixing or finishing a language that is already here

Open `src/shared/locales/<language>/messages.po` and fill in the empty
`msgstr` lines. The `msgid` above each one is the English as it appears
in the app.

```po
#: src/widgets/team-sidebar/ui/TeamSidebar/TeamSidebar.tsx:48
msgid "Your team"
msgstr "내 팀"
```

Write the line as someone would say it in that language. It does not
have to follow the English word for word, and it is better when it does
not.

## Adding a language

1. Add it to `locales` in `lingui.config.ts`.
2. Add it to `KNOWN` in `src/shared/lib/say/say.ts`, and to the picker in
   `src/widgets/setup/lib/tongues/tongues.ts`.
3. Run `npm run i18n:extract`. Your catalog appears with every line
   waiting.
4. Fill in what you can and open a pull request. Leaving lines empty is
   allowed.

## Braces

Some lines carry a value:

```po
msgid "Waiting to run {0}"
msgstr "{0} 실행을 기다립니다"
```

Keep every brace, and put it where your language wants it. Dropping one
loses whatever it was carrying. A test checks this.

## After changing a line in the app

Run `npm run i18n:extract`. It rewrites the catalogs to match the
source, keeping translations that are still needed. `npm test` fails if
you forget.

---

# Zetrem 번역하기

Zetrem 은 영어로 쓰였고, 다른 언어는 `src/shared/locales` 의 PO 카탈로그에서
읽는다. 아무도 옮기지 않은 줄은 영어로 나오므로, 절반만 된 언어도 그대로
내보내면 된다.

## 이미 있는 언어를 고치거나 채우기

`src/shared/locales/<언어>/messages.po` 를 열고 빈 `msgstr` 을 채운다. 그
위의 `msgid` 가 앱에 나오는 영어 원문이다.

```po
#: src/widgets/team-sidebar/ui/TeamSidebar/TeamSidebar.tsx:48
msgid "Your team"
msgstr "내 팀"
```

그 언어를 쓰는 사람이 말하듯 적는다. 영어를 단어마다 따라갈 필요가 없고
따라가지 않는 편이 낫다.

## 언어 추가하기

1. `lingui.config.ts` 의 `locales` 에 넣는다.
2. `src/shared/lib/say/say.ts` 의 `KNOWN` 과
   `src/widgets/setup/lib/tongues/tongues.ts` 의 선택 목록에 넣는다.
3. `npm run i18n:extract` 를 돌린다. 모든 줄이 빈 채로 카탈로그가 생긴다.
4. 할 수 있는 만큼 채우고 PR 을 연다. 빈 줄을 남겨도 된다.

## 중괄호

값이 실리는 줄이 있다.

```po
msgid "Waiting to run {0}"
msgstr "{0} 실행을 기다립니다"
```

중괄호는 하나도 빼지 말고 그 언어에서 자연스러운 자리에 놓는다. 하나를
빠뜨리면 거기 실려 있던 값이 사라진다. 테스트가 이를 잡아낸다.

## 앱의 문구를 고친 다음

`npm run i18n:extract` 를 돌린다. 카탈로그를 원문에 맞춰 다시 쓰되, 아직
쓰이는 번역은 남긴다. 잊으면 `npm test` 가 실패한다.
