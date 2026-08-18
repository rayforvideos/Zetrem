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
