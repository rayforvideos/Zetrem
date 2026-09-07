import { t } from '@lingui/core/macro'
import { helpersOf, topLevel } from '@/entities/agent-session'
import { modeFromCli, modelFromCli } from '@/entities/claude-cli'
import { hintDue, hintSeen } from '@/entities/settings'
import { AgentReport } from '@/widgets/agent-report'
import { awayOf, spokeAtMs, Composer, ConversationPane, RestartNote } from '@/widgets/conversation'
import { useLibraryAccess } from '../../model/library/useLibraryAccess'
import type {
  LibraryNotes,
  LibraryProposals,
  Workspace,
} from '../../model/screen/useWorkspace/useWorkspace.types'

// The conversation gate: the transcript, the composer under it, and the
// teammate report to the side.
export function ConversationGate({
  work,
  library,
  proposals,
  chatTitleOf,
}: {
  work: Workspace
  library: LibraryNotes
  proposals: LibraryProposals
  chatTitleOf(session: string): string | null
}) {
  const { chatting, prefs, team } = work
  const { agent, attach, children, conv, focus, held, nowMs, status } = chatting
  const { settings, update, reload } = prefs
  const libraryAccess = useLibraryAccess(work.projects.current?.path ?? null, chatting.live)
  // The subagents a teammate called in belong to that teammate's report, not
  // to the row of teammates the conversation is waiting on.
  const teammates = topLevel(children)
  const open = chatting.openAgent

  function restart(): void {
    chatting.setPendingRestart(null)
    focus.clearAll()
    agent.restart()
  }

  // What the running session reported about itself, in the app's own words. A
  // model left on 'default' names nothing the session could contradict: the
  // CLI was asked to choose, so whatever it chose is the choice.
  const runningPermissionMode = held === null ? null : modeFromCli(held.permissionMode)
  const runningModel =
    held === null || settings.model === 'default' ? null : modelFromCli(held.model)

  return (
    <ConversationPane
      turns={conv.turns}
      status={conv.status}
      statusState={status}
      permission={conv.permission}
      proposals={proposals.proposals}
      chatTitleOf={chatTitleOf}
      onAcceptProposal={proposals.accept}
      onDismissProposal={proposals.dismiss}
      you={{ name: team.yourName, face: settings.userFace }}
      away={agent.running ? awayOf(teammates, spokeAtMs(conv.turns)) : null}
      chores={conv.chores}
      nowMs={nowMs}
      project={work.projects.current?.path ?? null}
      hint={hintDue('ask-whole-job', settings.hintsSeen, conv.turns.length === 0)}
      onHintSeen={() => update({ hintsSeen: hintSeen('ask-whole-job', settings.hintsSeen) })}
      onDecide={agent.decide}
      onFileTurn={(text) => library.file(text)}
      composer={
        <>
          {chatting.pendingRestart !== null && agent.running && (
            <RestartNote said={chatting.pendingRestart} onRestart={restart} />
          )}
          <Composer
            files={attach.files}
            onPick={attach.pick}
            onTake={attach.take}
            onDropFile={attach.drop}
            empty={conv.turns.length === 0}
            busy={conv.status === 'working'}
            sessionLive={chatting.live}
            addressee={focus.addressee}
            permissionMode={settings.permissionMode}
            model={settings.model}
            effort={settings.effort}
            runningPermissionMode={runningPermissionMode}
            runningModel={runningModel}
            onRestart={restart}
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
        open === null ? null : (
          <AgentReport
            session={open}
            sessions={teammates}
            helpers={helpersOf(children, open.id)}
            nowMs={nowMs}
            onClose={() => focus.pick(null)}
            onPick={focus.pick}
            onCopyDiagnostics={() => chatting.diagnostics.copyTeammate(open)}
          />
        )
      }
    />
  )
}
