import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// <Trans> and useLingui throw without a provider above them. The app mounts
// one at its root, and only there: this keeps it from being lost again.
describe('the i18n provider', () => {
  it('wraps the whole screen in main.tsx', async () => {
    const main = await readFile(join(process.cwd(), 'src', 'app', 'main.tsx'), 'utf8')
    expect(main).toMatch(/<I18nProvider i18n=\{i18n\}>[\s\S]*<Root \/>[\s\S]*<\/I18nProvider>/)
  })
})
