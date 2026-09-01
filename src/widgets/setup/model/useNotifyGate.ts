import { t } from '@lingui/core/macro'
import { toast } from 'sonner'
import { notifyAllowed } from '../lib/notify-gate/notify-gate'

type Gate = {
  set(on: boolean): void
}

// The switch may only go on when the operating system would actually show a
// notification. A system-level refusal keeps the switch off and walks the
// user straight to the system's own settings to lift it.
export function useNotifyGate(onNotify: (on: boolean) => void): Gate {
  function set(on: boolean): void {
    if (!on) {
      onNotify(false)
      return
    }
    void notifyAllowed(() => window.desk.nudgeState()).then((allowed) => {
      if (allowed) {
        onNotify(true)
        return
      }
      toast.error(
        t`Notifications are off at the system level. Allow Zetrem in the system settings that just opened.`,
      )
      window.desk.openNotifySettings()
    })
  }

  return { set }
}
