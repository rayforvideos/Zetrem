import { SetupPane } from '@/widgets/setup'
import { pluginSummary } from '../../model/team/workspace-config/workspace-config'
import type { Workspace } from '../../model/screen/useWorkspace/useWorkspace.types'

// The settings gate: everything the setup pane needs, gathered from the
// domain groups and handed over in its own shapes.
export function SetupGate({
  work,
  onOpenProject,
}: {
  work: Workspace
  onOpenProject(id: string): void
}) {
  const { account, chatting, extensions, layout, prefs, projects, team } = work
  const { auth, stopAll } = account
  const { settings, update } = prefs

  return (
    <SetupPane
      account={{
        auth: auth.auth,
        accounts: auth.accounts,
        busy: auth.busy,
        busyOn: auth.busyOn,
        error: auth.authError,
        note: auth.loginNote,
        // Every chat, not just the one on screen: an account change stops them
        // all, so a reply running behind another chat still earns the warning.
        sessionLive: chatting.anyLive,
        installing: auth.installing,
        onInstall: auth.install,
        onRecheck: auth.recheck,
        onAdd: () => stopAll(auth.addAccount),
        onSwitch: (id) => stopAll(() => auth.switchAccount(id)),
        onReauth: (id) => stopAll(() => auth.reauthAccount(id)),
        onRemove: (id) => stopAll(() => auth.removeAccount(id)),
        onSignOut: () => stopAll(auth.logout),
        onCancelLogin: auth.cancelLogin,
      }}
      you={{
        name: settings.userName,
        face: settings.userFace,
        onName: (next) => update({ userName: next }),
        onFace: (next) => update({ userFace: next }),
      }}
      project={{
        chosen: projects.current,
        recent: projects.all.filter((one) => one.id !== projects.current?.id),
        onChoose: projects.pick,
        onPickRecent: onOpenProject,
      }}
      defaults={{
        permissionMode: settings.permissionMode,
        model: settings.model,
        effort: settings.effort,
        onEffort: (effort) => update({ effort }),
        onPermissionMode: (permissionMode) => update({ permissionMode }),
        tongue: settings.tongue,
        onTongue: (next) => update({ tongue: next }),
        notify: settings.notify,
        onNotify: (on) => update({ notify: on }),
        enterSends: settings.enterSends,
        onEnterSends: (on) => update({ enterSends: on }),
        chrome: settings.chrome,
        onChrome: (on) => update({ chrome: on }),
        passEnv: settings.passEnv,
        onPassEnv: (passEnv) => update({ passEnv }),
        onModel: (model) => update({ model }),
      }}
      plugins={{
        summary: pluginSummary(
          extensions.shelf.catalog.installed.length,
          extensions.shelf.marketplaces.length,
        ),
        onOpen: extensions.shelf.show,
      }}
      agents={team.toggles}
      actions={{
        reopened: settings.setupDone,
        signedIn: account.signedIn,
        hasProject: projects.current?.path != null,
        onStart: layout.panel.start,
        onCancel: layout.panel.cancel,
      }}
      notice={prefs.failure ?? projects.failure}
    />
  )
}
