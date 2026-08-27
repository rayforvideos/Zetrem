import { t } from '@lingui/core/macro'
import { Zap } from 'lucide-react'
import { isGuide } from '@/entities/vault'
import { NoteList } from '../NoteList/NoteList'
import { NoteReader } from '../NoteReader/NoteReader'
import type { VaultPaneProps } from './VaultPane.types'

export function VaultPane({
  folders,
  notes,
  open,
  loading,
  editing,
  fresh,
  guideOpen,
  onOpen,
  onOpenTitle,
  onRemove,
  onStartEdit,
  onStopEdit,
  onSave,
  onRename,
  onCreate,
  onOpenGuide,
  onAddFolder,
  onRenameFolder,
  onRemoveFolder,
  sidebar,
}: VaultPaneProps) {
  const titles = new Set(notes.map((one) => one.title))

  return (
    <div data-vault-pane className="relative z-[3] flex h-full gap-7">
      {sidebar}
      <div className="zt-rise flex w-full min-w-0 flex-1 flex-col px-6 py-6">
        <h2 className="truncate pb-4 text-xs tracking-[0.08em] text-muted-foreground">
          {t`Vault`}
        </h2>
        <div className="flex min-h-0 flex-1 gap-8">
          <div className="flex w-72 min-w-0 flex-none flex-col">
            <NoteList
              folders={folders}
              notes={notes}
              openId={open?.id ?? null}
              guideOpen={guideOpen}
              onOpen={onOpen}
              onOpenGuide={onOpenGuide}
              onCreate={onCreate}
              onAddFolder={onAddFolder}
              onRenameFolder={onRenameFolder}
              onRemoveFolder={onRemoveFolder}
            />
          </div>
          {notes.length === 0 && open === null ? (
            loading ? (
              <p className="m-auto text-sm text-muted-foreground">{t`Reading the vault…`}</p>
            ) : (
              <div className="m-auto flex max-w-xs flex-col items-center gap-3 text-center">
                <Zap className="size-8 text-muted-foreground/50" />
                <p className="text-sm text-foreground">{t`The vault is empty`}</p>
                <p className="text-xs text-muted-foreground">
                  {t`Hover an answer in a conversation and press the bolt to file it here`}
                </p>
              </div>
            )
          ) : open === null ? (
            <p className="m-auto text-sm text-muted-foreground">{t`Pick a note`}</p>
          ) : (
            <NoteReader
              note={open}
              titles={titles}
              editing={editing}
              fresh={fresh}
              guide={isGuide(open.id)}
              onOpenTitle={onOpenTitle}
              onRemove={onRemove}
              onStartEdit={onStartEdit}
              onStopEdit={onStopEdit}
              onSave={onSave}
              onRename={onRename}
            />
          )}
        </div>
      </div>
    </div>
  )
}
