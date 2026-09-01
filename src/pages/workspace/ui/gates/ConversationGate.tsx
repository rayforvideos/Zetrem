import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { hintDue, hintSeen } from '@/entities/settings'
import { AgentReport } from '@/widgets/agent-report'
import { awayOf, spokeAtMs, Composer, ConversationPane, RestartNote } from '@/widgets/conversation'
import { useLibraryAccess } from '../../model/library/useLibraryAccess'
import type { LibraryNotes, Workspace } from '../../model/screen/useWorkspace/useWorkspace.types'

// The conversation gate: the transcript, the composer under it, and the
// teammate report to the side.
export function ConversationGate({
  work,
  library,
  sidebar,
}: {
  work: Workspace
  library: LibraryNotes
  sidebar: ReactNode
}) {
  const { chatting, prefs, team } = work
  const { agent, attach, chat, children, conv, focus, nowMs, status } = chatting
  const { settings, update, reload } = prefs
  const libraryAccess = useLibraryAccess(work.projects.current?.path ?? null, chatting.live)

  return (
    <ConversationPane
      turns={conv.turns}
      status={conv.status}
      statusState={status}
      permission={conv.permission}
      you={{ name: team.yourName, face: settings.userFace }}
      away={agent.running ? awayOf(children, spokeAtMs(conv.turns)) : null}
      chores={conv.chores}
      nowMs={nowMs}
      hint={hintDue('ask-whole-job', settings.hintsSeen, conv.turns.length === 0)}
      onHintSeen={() => update({ hintsSeen: hintSeen('ask-whole-job', settings.hintsSeen) })}
      onDecide={agent.decide}
      onFileTurn={(text) => library.file(text)}
      composer={
        <>
          {chatting.pendingRestart !== null && agent.running && (
            <RestartNote
              said={chatting.pendingRestart}
              onRestart={() => {
                chatting.setPendingRestart(null)
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
            sessionLive={chatting.live}
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
        chatting.openAgent === null ? null : (
          <AgentReport
            session={chatting.openAgent}
            sessions={children}
            nowMs={nowMs}
            onClose={() => focus.pick(null)}
            onPick={focus.pick}
          />
        )
      }
      sidebar={sidebar}
    />
  )
}
