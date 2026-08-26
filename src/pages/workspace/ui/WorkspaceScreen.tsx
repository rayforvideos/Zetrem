import { hintDue, hintSeen } from '@/entities/settings'
import { CrewProvider } from '@/entities/teammate'
import { withSessionAuth } from '@/entities/connector'
import { PanelLeft } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  WORDMARK_SIGNATURE_OPACITY,
  WORDMARK_SIZE,
  Wordmark,
} from '@/shared/graphics/Wordmark/Wordmark'
import { AgentReport } from '@/widgets/agent-report'
import { awayOf, spokeAtMs, Composer, ConversationPane, RestartNote } from '@/widgets/conversation'
import { SetupPane } from '@/widgets/setup'
import { TeamSidebar } from '@/widgets/team-sidebar'
import { WelcomePane } from '@/widgets/welcome'
import { TileDeck } from '@/widgets/tile-deck'
import { MOTION } from '@/shared/config/motion/motion'
import { Titlebar } from '@/widgets/titlebar'
import { tuckedBy } from '../model/screen/tuck/tuck'
import { crewOf, pluginSummary } from '../model/team/workspace-config/workspace-config'
import { PluginShelfOverlay } from './controls/PluginShelfOverlay'
import { StatusBarPanel } from './controls/StatusBarPanel'
import { t } from '@lingui/core/macro'

import { useWorkspace } from '../model/screen/useWorkspace/useWorkspace'

export function WorkspaceScreen() {
  const {
    agent,
    agentToggles,
    allProjects,
    atWork,
    attach,
    attachSidebar,
    auth,
    chat,
    children,
    conv,
    deck,
    deckSidebarW,
    defs,
    drafts,
    drawerOpen,
    edit,
    focus,
    gate,
    handleForgetProject,
    handleOpenProject,
    handlePickProject,
    hasProject,
    held,
    hire,
    live,
    nowMs,
    openAgent,
    panel,
    pendingRestart,
    project,
    projectFailure,
    release,
    reload,
    setDrawerOpen,
    setPendingRestart,
    settings,
    settingsFailure,
    settleNote,
    shelf,
    sidebar,
    sidebarBoxW,
    sidebarLabel,
    signedIn,
    status,
    swap,
    teamMembers,
    teamNote,
    update,
    viewport,
    wires,
    yourName,
  } = useWorkspace()

  return (
    <CrewProvider crew={crewOf(defs, status.session?.model ?? null)}>
      <div
        data-live={atWork ? '' : undefined}
        data-talk={conv.status}
        data-activity={status.activity}
        data-spent={`${status.cost.turns}:${status.context.used}`}
        className="flex h-full min-h-0 flex-col"
      >
        <div className="relative min-h-0 flex-1">
          <TileDeck
            state={deck.state}
            sessions={children}
            face={settings.userFace}
            name={yourName}
            viewport={viewport}
            onDismiss={deck.closeOne}
            nowMs={nowMs}
            sidebarW={deckSidebarW}
            roster={sidebar.open}
            terminal={
              gate === 'welcome' ? (
                <WelcomePane onDone={() => update({ onboarded: true })} />
              ) : gate === 'holding' ? (
                <div className="relative z-[3] flex h-full items-center justify-center">
                  <Wordmark
                    width={WORDMARK_SIZE.signature}
                    className={WORDMARK_SIGNATURE_OPACITY}
                  />
                </div>
              ) : gate === 'setup' ? (
                <SetupPane
                  account={{
                    auth: auth.auth,
                    error: auth.authError,
                    note: auth.loginNote,
                    signingIn: auth.loggingIn,
                    signingOut: auth.loggingOut,
                    sessionLive: live,
                    installing: auth.installing,
                    onSignIn: auth.login,
                    onInstall: auth.install,
                    onSignOut: () => {
                      // The warning says the running session stops. Stop it, rather
                      // than leaving it holding credentials the user just revoked.
                      swap(auth.logout)
                    },
                  }}
                  you={{
                    name: settings.userName,
                    face: settings.userFace,
                    onName: (next) => update({ userName: next }),
                    onFace: (next) => update({ userFace: next }),
                  }}
                  project={{
                    chosen: project,
                    recent: allProjects.filter((one) => one.id !== project?.id),
                    onChoose: handlePickProject,
                    onPickRecent: handleOpenProject,
                  }}
                  defaults={{
                    permissionMode: settings.permissionMode,
                    model: settings.model,
                    onPermissionMode: (permissionMode) => update({ permissionMode }),
                    tongue: settings.tongue,
                    onTongue: (next) => update({ tongue: next }),
                    notify: settings.notify,
                    onNotify: (on) => update({ notify: on }),
                    enterSends: settings.enterSends,
                    onEnterSends: (on) => update({ enterSends: on }),
                    onModel: (model) => update({ model }),
                  }}
                  plugins={{
                    summary: pluginSummary(
                      shelf.catalog.installed.length,
                      shelf.marketplaces.length,
                    ),
                    onOpen: shelf.show,
                  }}
                  agents={agentToggles}
                  actions={{
                    reopened: settings.setupDone,
                    signedIn,
                    hasProject,
                    onStart: panel.start,
                    onCancel: panel.cancel,
                  }}
                  notice={settingsFailure ?? projectFailure}
                />
              ) : (
                <ConversationPane
                  turns={conv.turns}
                  status={conv.status}
                  statusState={status}
                  permission={conv.permission}
                  you={{ name: yourName, face: settings.userFace }}
                  away={agent.running ? awayOf(children, spokeAtMs(conv.turns)) : null}
                  chores={conv.chores}
                  nowMs={nowMs}
                  hint={hintDue('ask-whole-job', settings.hintsSeen, conv.turns.length === 0)}
                  onHintSeen={() =>
                    update({ hintsSeen: hintSeen('ask-whole-job', settings.hintsSeen) })
                  }
                  onDecide={agent.decide}
                  composer={
                    <>
                      {pendingRestart !== null && agent.running && (
                        <RestartNote
                          said={pendingRestart}
                          onRestart={() => {
                            setPendingRestart(null)
                            focus.clearAll()
                            agent.restart()
                          }}
                        />
                      )}
                      <Composer
                        files={attach.files}
                        onPick={attach.pick}
                        onTake={attach.take}
                        onDropFile={attach.drop}
                        empty={conv.turns.length === 0}
                        busy={conv.status === 'working'}
                        sessionLive={live}
                        addressee={focus.addressee}
                        permissionMode={settings.permissionMode}
                        model={settings.model}
                        refusedModels={settings.refusedModels}
                        enterSends={settings.enterSends}
                        onSend={(text) => {
                          agent.send(text, focus.addressee, attach.files)
                          attach.clear()
                          focus.address(null)
                        }}
                        onStop={agent.stop}
                        onClearAddressee={() => focus.address(null)}
                        onPermissionMode={(permissionMode) =>
                          reload(
                            { permissionMode },
                            t`Permissions changed. The running session follows the old ones.`,
                          )
                        }
                        onModel={(model) =>
                          reload({ model }, t`Model changed. The running session keeps its model.`)
                        }
                      />
                    </>
                  }
                  report={
                    openAgent === null ? null : (
                      <AgentReport
                        session={openAgent}
                        sessions={children}
                        nowMs={nowMs}
                        onClose={() => focus.pick(null)}
                        onPick={focus.pick}
                      />
                    )
                  }
                  sidebar={
                    <div
                      ref={attachSidebar}
                      data-tucked={sidebar.open ? undefined : ''}
                      style={{
                        marginLeft: tuckedBy(sidebar.open, sidebarBoxW, sidebar.width),
                        transition: `margin ${MOTION.moveMs}ms ${MOTION.easing}`,
                      }}
                      className="flex flex-none"
                    >
                      <TeamSidebar
                        projects={{
                          current: project,
                          all: allProjects,
                          onOpen: handleOpenProject,
                          onPickFolder: handlePickProject,
                          onForget: handleForgetProject,
                        }}
                        chats={{
                          chats: chat.chats,
                          openId: chat.openId,
                          onOpen: (id) => swap(() => chat.open(id)),
                          onStart: () => swap(chat.start),
                          onRemove: chat.remove,
                          onRename: chat.rename,
                          onFile: chat.file,
                          onFileMany: chat.fileMany,
                        }}
                        team={{
                          members: teamMembers,
                          drafts,
                          knownTools: settings.knownTools,
                          sessionUp: held !== null,
                          read: focus.read,
                          canWrite: true,
                          hint: hintDue('hire-first', settings.hintsSeen, defs.length === 0),
                          onHintSeen: () =>
                            update({ hintsSeen: hintSeen('hire-first', settings.hintsSeen) }),
                          note: teamNote,
                          onHire: hire,
                          onEdit: edit,
                          onRelease: release,
                          onPick: focus.pick,
                          onAddress: focus.address,
                          onRestart: () => {
                            focus.clearAll()
                            settleNote()
                            agent.restart()
                          },
                        }}
                        agents={agentToggles}
                        nowMs={nowMs}
                        width={sidebar.width}
                        onResize={sidebar.resize}
                        onResizeEnd={sidebar.commit}
                      />
                    </div>
                  }
                />
              )
            }
          />

          <PluginShelfOverlay
            shelf={shelf}
            wires={{
              ...wires,
              connectors: withSessionAuth(wires.connectors, status.session?.mcp ?? []),
            }}
            project={project?.path ?? null}
          />
        </div>
        <StatusBarPanel
          shown={gate !== 'welcome'}
          status={status}
          wires={wires}
          nowMs={nowMs}
          open={drawerOpen}
          onToggle={() => setDrawerOpen((was) => !was)}
        />
      </div>

      <Titlebar
        left={
          settings.setupDone && (
            <Button
              variant="quiet"
              size="bare"
              onClick={sidebar.toggle}
              aria-pressed={sidebar.open}
              aria-label={sidebarLabel}
              title={sidebarLabel}
              className="zt-hit"
            >
              <PanelLeft className="size-3.5" />
            </Button>
          )
        }
      >
        {settings.setupDone && (
          <Button
            variant="quiet"
            size="bare"
            onClick={panel.show}
            className="zt-hit text-xs"
            title={t`Change account, project, and permissions`}
          >
            {t`Settings`}
          </Button>
        )}
      </Titlebar>
    </CrewProvider>
  )
}
