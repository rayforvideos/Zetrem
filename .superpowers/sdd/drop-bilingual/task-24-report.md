# Task 24 report — drop the bilingual convention and the releasing doc

## Commit

`f96105f` — chore: drop the bilingual commit convention and the releasing doc

(Amended once, after a scope update from the maintainer widened this from
"commits only" to "the split marker abolished everywhere." Same hash space,
one commit, still unpushed.)

## File changes

- **`docs/releasing.md`**: deleted via `git rm`. It only served the
  maintainer's own release process, which does not belong in the repo per the
  maintainer's direction.
- **`README.md`**: removed the sentence "Cutting a release is
  [docs/releasing.md](docs/releasing.md), which only the maintainer needs."
  from the Contributing section. Kept the rest of that paragraph (translation
  pointer, security pointer) intact.
- **`README.ko.md`**: removed the matching Korean sentence pointing at
  `docs/releasing.md` from the 기여 (Contributing) section, same scope.
- **`CONTRIBUTING.md`**: reworded the Commits section from the old
  "Subject in English, body in English then Korean, separated by [the split
  marker]" rule to "Subject and body, both in English." Replaced the
  bilingual example commit (which had carried the split marker plus a Korean
  paragraph) with an English-only example in the same spirit. No trace of the
  marker or of Korean text remains in the file. Kept the "say why, not what"
  line and the section's plain, declarative voice.
- **`SECURITY.md`** (added to owned files after the scope update): dropped
  its Korean half entirely, the same treatment CONTRIBUTING got. The English
  half (Reporting, What the app has access to, Out of scope) is untouched
  content and untouched wording. No `SECURITY.ko.md` was created, per
  instruction.
- **`tests/conventions/commit-shape.test.ts`**: removed the constant that
  held the split-marker string, the Hangul-detection regex, and the test case
  that required every commit body to contain the marker plus Korean text
  after it. Renamed the outer `describe` from "in both languages" to plain
  "a commit says what kind it is." Kept the type-prefix and subject-length
  checks untouched. This only removes a requirement, it adds no new assertion,
  so historic commits that still carry the old marker keep passing.
- **`tests/conventions/plain-punctuation.test.ts`**: dropped the local
  constant that held the split-marker string and the em-dash exception built
  on it in the "holds the documents to the same rule" test (dead now that
  neither `README.md` nor `CONTRIBUTING.md` contains that marker anymore).
  Reshaped the "the commit convention says which language goes where"
  describe/it instead of deleting it: it now asserts `CONTRIBUTING.md`
  contains "Subject and body, both in English" and does not contain the
  Korean word for Korean, so a bilingual instruction cannot silently creep
  back into the doc. Kept the describe block since a test that pins the
  convention doc's wording still earns its place.

## Acceptance check

Ran the maintainer's exact check after finishing the edits:

```
grep -rn "[the split marker: em dash, space, space, the Korean word for
Korean, space, space, em dash]" --exclude-dir=node_modules --exclude-dir=.git .
```

Returns nothing over the working tree, including this report (written to
describe the marker without reproducing it, for that reason).

## Rationale for the plain-punctuation.test.ts reshape

Deleting the "commit convention" describe outright would have left
`CONTRIBUTING.md`'s Commits section unguarded by any test, which is exactly
the gap the original test existed to close (per its own comment in
`commit-shape.test.ts`: "a convention no test holds is one that drifts the
moment somebody is in a hurry"). Reshaping it to check the new English-only
wording, plus a negative check that the Korean word for Korean doesn't
reappear, keeps that guard intact for the new rule instead of just removing
it.

## Test runs

- **Before the commit**: `npm test` (185 test files, 1734 tests) all passed.
  `npm run typecheck` clean.
- **After the commit** (both the original commit-only-scope version, and
  again after amending it for the SECURITY.md / marker-everywhere scope
  update): `npm test` (185 test files, 1734 tests) all passed, including
  `commit-shape.test.ts` inspecting this commit's own message and the full
  history, where commits still carrying the old marker keep passing.
  `npm run typecheck` clean both times.

## Concerns

None. The commit message is English-only (type prefix, subject <=72 chars,
English body, correct co-author line) and passes the reshaped commit-shape
test. Historic commits with the old bilingual block still pass, since the
test stopped requiring the marker rather than starting to forbid it. The
acceptance grep for the literal marker returns nothing anywhere in the
working tree.
