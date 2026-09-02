import type { ReactNode } from 'react'
import { LibraryPane } from '@/widgets/library'
import type {
  LibraryNotes,
  LibraryProposals,
} from '../../model/screen/useWorkspace/useWorkspace.types'

// The library gate: the notes pane over the whole terminal area.
export function LibraryGate({
  library,
  proposals,
  nowMs,
  sidebar,
}: {
  library: LibraryNotes
  proposals: LibraryProposals
  nowMs: number
  sidebar: ReactNode
}) {
  return (
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
      proposals={proposals.proposals}
      onAcceptProposal={proposals.accept}
      onDismissProposal={proposals.dismiss}
      sidebar={sidebar}
    />
  )
}
