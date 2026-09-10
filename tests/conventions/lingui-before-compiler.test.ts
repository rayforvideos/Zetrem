import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

// The Lingui macro names each message by a hash of its text, and the catalogue
// is built by `lingui extract`, which runs no other Babel plugin. React Compiler
// renames the locals it hoists (title becomes title_0), so if it runs first the
// macro hashes text the extractor never saw and the toast reads Dos3Nd instead
// of words. Both configs must agree, or the tests pass a build that fails.
const MACRO = '@lingui/babel-plugin-lingui-macro'
const COMPILER = 'babel-plugin-react-compiler'

describe.each(['electron.vite.config.ts', 'vitest.config.ts'])(
  'the babel pipeline in %s',
  (config) => {
    it('runs the Lingui macro before React Compiler', async () => {
      const body = await readFile(config, 'utf8')
      const macroAt = body.indexOf(MACRO)
      const compilerAt = body.indexOf(COMPILER)
      expect(macroAt, `${config} no longer lists ${MACRO}`).toBeGreaterThan(-1)
      expect(compilerAt, `${config} no longer lists ${COMPILER}`).toBeGreaterThan(-1)
      expect(
        macroAt,
        `${config}: the compiler renames locals before the macro hashes them, so ` +
          'the ids miss the catalogue. List the macro first',
      ).toBeLessThan(compilerAt)
    })
  },
)
