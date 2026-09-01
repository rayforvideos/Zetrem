import { useEffect, useRef } from 'react'
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
import { askForStar, starDue } from '@/widgets/star-ask'
import { layerOver } from '@/shared/lib/modal/modal'
import { SetupPane } from '@/widgets/setup'
import { TeamSidebar } from '@/widgets/team-sidebar'
import { LibraryPane } from '@/widgets/library'
import { WelcomePane } from '@/widgets/welcome'
import { TileDeck } from '@/widgets/tile-deck'
import { MOTION } from '@/shared/config/motion/motion'
import { GitDesk } from '@/widgets/git-desk'
import { Titlebar } from '@/widgets/titlebar'
import { tuckedBy } from '../model/screen/tuck/tuck'
import { crewOf, pluginSummary } from '../model/team/workspace-config/workspace-config'
import { PluginShelfOverlay } from './controls/PluginShelfOverlay'
import { StatusBarPanel } from './controls/StatusBarPanel'
import { t } from '@lingui/core/macro'

import { useLibraryAccess } from '../model/library/useLibraryAccess'
import { useLibraryNotes } from '../model/library/useLibraryNotes'
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
    leaveLibrary,
    live,
    nowMs,
    openAgent,
    openLibrary,
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
    libraryOpen,
    viewport,
    wires,
    yourName,
  } = useWorkspace()
  const library = useLibraryNotes(libraryOpen, conv.status !== 'working', project?.path ?? null)

  // The GitHub star ask: a toast as a reply lands, a few chats in, and again
  // a week later until the star is given. The moment it shows is remembered,
  // so letting it pass counts as "not now".
  const wasWorking = useRef(false)
  useEffect(() => {
    // A finished turn leaves the session waiting, or done once it has exited.
    const settled = wasWorking.current && conv.status !== 'working'
    wasWorking.current = conv.status === 'working'
    if (!settled) return
    const due = starDue({
      chats: chat.chats.length,
      settled: true,
      starred: settings.starred,
      askedAtMs: settings.starAskedAtMs,
      nowMs: Date.now(),
      layered: layerOver(document),
    })
    if (!due) return
    update({ starAskedAtMs: Date.now() })
    askForStar({ star: () => update({ starred: true }) })
  }, [conv.status, chat.chats.length, settings.starred, settings.starAskedAtMs, update])
  const libraryAccess = useLibraryAccess(project?.path ?? null, live)

  function pickTeammate(id: string | null): void {
    leaveLibrary()
    focus.pick(id)
  }

  function addressTeammate(name: string | null): void {
    leaveLibrary()
    focus.address(name)
  }

  const teamSidebar = (
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
          // A note still being typed is saved into this project before the next one takes over.
          onOpen: (id) => void library.flush().then(() => handleOpenProject(id)),
          onPickFolder: handlePickProject,
          onForget: handleForgetProject,
        }}
        chats={{
          chats: chat.chats,
          openId: libraryOpen ? null : chat.openId,
          onOpen: (id) => swap(() => chat.open(id)),
          onStart: () => swap(chat.start),
          // Removing the chat that is open mid-reply must also let its agent go.
          onRemove: (id) => (id === chat.openId ? swap(() => chat.remove(id)) : chat.remove(id)),
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
          onHintSeen: () => update({ hintsSeen: hintSeen('hire-first', settings.hintsSeen) }),
          note: teamNote,
          onHire: hire,
          onEdit: edit,
          onRelease: release,
          onPick: pickTeammate,
          onAddress: addressTeammate,
          onRestart: () => {
            focus.clearAll()
            settleNote()
            chat.detach()
            agent.restart()
          },
        }}
        agents={agentToggles}
        nowMs={nowMs}
        width={sidebar.width}
        onResize={sidebar.resize}
        onResizeEnd={sidebar.commit}
        libraryOpen={libraryOpen}
        libraryUnseen={library.unseen}
        onOpenLibrary={openLibrary}
      />
    </div>
  )

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
                    accounts: auth.accounts,
                    busy: auth.busy,
                    busyOn: auth.busyOn,
                    error: auth.authError,
                    note: auth.loginNote,
                    sessionLive: live,
                    installing: auth.installing,
                    onInstall: auth.install,
                    onRecheck: auth.recheck,
                    onAdd: () => swap(auth.addAccount),
                    onSwitch: (id) => swap(() => auth.switchAccount(id)),
                    onReauth: (id) => swap(() => auth.reauthAccount(id)),
                    onRemove: (id) => swap(() => auth.removeAccount(id)),
                    onSignOut: () => swap(auth.logout),
                    onCancelLogin: auth.cancelLogin,
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
                    onPickRecent: (id) => void library.flush().then(() => handleOpenProject(id)),
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
              ) : libraryOpen ? (
                <LibraryPane
                  folders={library.folders}
                  notes={library.notes}
                  hits={library.hits}
                  query={library.query}
                  tag={library.tag}
                  open={library.open}
                  backlinks={library.backlinks}
                  loading={library.loading}
                  editing={library.editing}
                  fresh={library.fresh}
                  savedAtMs={library.savedAtMs}
                  nowMs={nowMs}
                  onQuery={library.setQuery}
                  onTag={library.setTag}
                  onOpen={library.openNote}
                  onOpenTitle={library.openTitle}
                  onCreate={library.create}
                  onRemove={library.remove}
                  onStartEdit={library.startEdit}
                  onStopEdit={library.stopEdit}
                  onSave={library.save}
                  onRename={library.rename}
                  onTags={library.tags}
                  onAddFolder={library.addFolder}
                  onRenameFolder={library.renameFolder}
                  onRemoveFolder={library.removeFolder}
                  sidebar={teamSidebar}
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
                  onFileTurn={(text) => library.file(text)}
                  composer={
                    <>
                      {pendingRestart !== null && agent.running && (
                        <RestartNote
                          said={pendingRestart}
                          onRestart={() => {
                            setPendingRestart(null)
                            focus.clearAll()
                            chat.detach()
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
                        effort={settings.effort}
                        onEffort={(effort) => update({ effort })}
                        refusedModels={settings.refusedModels}
                        enterSends={settings.enterSends}
                        library={libraryAccess.open}
                        onLibrary={libraryAccess.set}
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
                  sidebar={teamSidebar}
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
        {settings.setupDone && <GitDesk project={project?.path ?? null} />}
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
