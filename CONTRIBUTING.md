# Contributing to Zetrem

Rules here are enforced by tests in `tests/conventions/`. If you break one,
`npm test` tells you which and where. Nothing in this file is a matter of taste
that only a reviewer knows.

```bash
npm run dev        # run the app
npm test           # unit tests plus the convention guards
npm run typecheck
npm run build
```

## Layout

Feature-Sliced Design. Layers lean one way only. A layer may import from the
layers below it, never above.

```
src/app        composition root, the IPC contract with the main process
src/pages      screens and the state that belongs to a screen
src/widgets    composed blocks a page arranges
src/entities   domain concepts and the UI that renders them
src/shared     things with no domain knowledge
electron       main process
tests          repo-wide convention guards
```

`src/shared/ui/` belongs to the shadcn CLI. `npx shadcn@latest add` writes
there. Do not hand-edit those files beyond what a diff review would accept, and
do not put your own components among them: a component that imports from
`@/entities`, `@/widgets`, `@/pages` or `@/app` is not shared, it belongs beside
the thing it knows about. Ours live in `src/shared/graphics/` (marks and icons)
or in an entity's own `ui/` folder.

## Tests live with their module

A module that has a test gets its own folder, named after the module. The file
names do not change.

```
shared/lib/units/units.ts
shared/lib/units/units.test.ts
shared/lib/cn.ts               ← no test, no folder
```

A module may have more than one test file in that folder. Tests that guard a
repo-wide rule rather than a single module go in `tests/conventions/`.

## Types live apart from logic

A module's types go in `<module>.types.ts`, next to the module. The logic file
imports what it needs; it does not re-export them. Consumers take types from the
entity barrel, which points at the `.types` file, so code that only needs a
shape never depends on the implementation.

```
shared/lib/tool-shape/tool-shape.types.ts   ToolShape
shared/lib/tool-shape/tool-shape.ts         toolShape()
shared/lib/tool-shape/tool-shape.test.ts
```

A `.types.ts` file exports no values. Deleting it must not change what runs.

Model with unions, not optional flags. `AuthStatus` is
`signed-in | signed-out | cli-missing`, not a record with four maybe-fields, so
a signed-out account cannot carry an email. When you add a variant the compiler
lists every place that has to handle it.

## Code

**Comments say why, not what.** The code already says what it does, and a
comment that repeats it goes stale on the next edit. Write one for the reason
the code could not carry: a platform's behaviour, a decision that looks wrong
until you know what it is avoiding, a shape on disk that people already have.

```ts
// taskkill exits non-zero when the process is already gone.
```

Names and tests carry the intent, so a comment that only names the intent is
one the code should have named instead.

**Switch over repeated type checks.** Three or more comparisons against the same
discriminant become a `switch`, so TypeScript can see which cases are covered
and a new variant fails to compile instead of falling through silently.

**Do not draw what you do not know.** A value the engine never sent is not a
zero and not a dash. The row does not exist. A failure is shown with its
reason, never swallowed into a state that looks like success.

**Semantic tokens, not hand-carved values.** No `text-[13px]`, no bare
`opacity-45`, no palette colours. Tailwind's scale and the shadcn tokens hold
the ruler. Agent faces are the one place colour is allowed.

## Commits

Subject and body, both in English. Say why, not what. The diff already says
what.

```
feat: let the person change accounts

There was a way in and no way out...
```
