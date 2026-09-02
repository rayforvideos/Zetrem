import { hintDue, hintSeen } from '@/entities/settings'
import { MOTION } from '@/shared/config/motion/motion'
import { TeamSidebar } from '@/widgets/team-sidebar'
import { chatSwitch } from '../../model/chat/chat-switch/chat-switch'
import { tuckedBy } from '../../model/screen/tuck/tuck'
import type { LibraryNotes, Workspace } from '../../model/screen/useWorkspace/useWorkspace.types'

// The team sidebar with its tuck-away animation, wired to the workspace: the
// one place the project list, the chat list, and the roster meet.
export function WorkspaceSidebar({
  work,
  library,
  onOpenProject,
}: {
  work: Workspace
  library: LibraryNotes
  onOpenProject(id: string): void
}) {
  const { account, chatting, layout, prefs, projects, team } = work
  const { chat, focus } = chatting

  function pickTeammate(id: string | null): void {
    layout.leaveLibrary()
    focus.pick(id)
  }

  function addressTeammate(name: string | null): void {
    layout.leaveLibrary()
    focus.address(name)
  }

  return (
    <div
      ref={layout.attachSidebar}
      data-tucked={layout.sidebar.open ? undefined : ''}
      style={{
        marginLeft: tuckedBy(layout.sidebar.open, layout.sidebarBoxW, layout.sidebar.width),
        transition: `margin ${MOTION.moveMs}ms ${MOTION.easing}`,
      }}
      className="flex flex-none"
    >
      <TeamSidebar
        projects={{
          current: projects.current,
          all: projects.all,
          // A note still being typed is saved into this project before the next one takes over.
          onOpen: onOpenProject,
          onPickFolder: projects.pick,
          onForget: projects.forget,
        }}
        chats={{
          chats: chat.chats,
          openId: layout.libraryOpen ? null : chat.openId,
          // Coming back to the open chat (from the library) must not end its session.
          onOpen: (id) =>
            chatSwitch(id, chat.openId) === 'return'
              ? layout.leaveLibrary()
              : account.swap(() => chat.open(id)),
          onStart: () => account.swap(chat.start),
          // Removing the chat that is open mid-reply must also let its agent go.
          onRemove: (id) =>
            id === chat.openId ? account.swap(() => chat.remove(id)) : chat.remove(id),
          onRename: chat.rename,
          onFile: chat.file,
          onFileMany: chat.fileMany,
        }}
        team={{
          members: team.members,
          drafts: team.drafts,
          knownTools: prefs.settings.knownTools,
          sessionUp: chatting.held !== null,
          read: focus.read,
          canWrite: true,
          hint: hintDue('hire-first', prefs.settings.hintsSeen, team.defs.length === 0),
          onHintSeen: () =>
            prefs.update({ hintsSeen: hintSeen('hire-first', prefs.settings.hintsSeen) }),
          note: team.note,
          onHire: team.hire,
          onEdit: team.edit,
          onRelease: team.release,
          onPick: pickTeammate,
          onAddress: addressTeammate,
          onRestart: () => {
            focus.clearAll()
            team.settleNote()
            chatting.agent.restart()
          },
        }}
        agents={team.toggles}
        nowMs={chatting.nowMs}
        width={layout.sidebar.width}
        onResize={layout.sidebar.resize}
        onResizeEnd={layout.sidebar.commit}
        libraryOpen={layout.libraryOpen}
        libraryUnseen={library.unseen}
        onOpenLibrary={layout.openLibrary}
      />
    </div>
  )
}
