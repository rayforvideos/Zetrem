import { useState } from 'react'
import { t } from '@lingui/core/macro'

// Asking by hand: one line under the version says where things stand. A
// download that starts here still raises the update card when it lands.
export function useAppUpdateCheck(): { note: string | null; asking: boolean; ask(): void } {
  const [note, setNote] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)

  function ask(): void {
    setAsking(true)
    setNote(null)
    void window.desk
      .updaterCheck()
      .catch(() => ({ state: 'trouble' as const, said: '' }))
      .then((got) => {
        setAsking(false)
        setNote(
          got.state === 'latest'
            ? t`This is the newest build.`
            : got.state === 'downloading'
              ? t`Downloading ${got.version ?? ''}. A card appears when it is ready.`
              : got.state === 'ready'
                ? t`${got.version ?? ''} is ready. Restart to install.`
                : got.state === 'dev'
                  ? t`A dev run does not update itself.`
                  : got.said !== undefined && got.said.length > 0
                    ? got.said
                    : t`Could not check for updates.`,
        )
      })
  }

  return { note, asking, ask }
}
