import { t } from '@lingui/core/macro'
import { CircleHelp, Library } from 'lucide-react'
import { isGuide } from '@/entities/vault'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { NoteList } from '../NoteList/NoteList'
import { NoteReader } from '../NoteReader/NoteReader'
import type { VaultPaneProps } from './VaultPane.types'

export function VaultPane(props: VaultPaneProps) {
  const { notes, open, loading, guideOpen, onOpenGuide, onCreate, sidebar } = props
  const titles = new Set(notes.map((one) => one.title))

  return (
    <div data-vault-pane className="relative z-[3] flex h-full gap-7">
      {sidebar}
      <div className="zt-rise flex w-full min-w-0 flex-1 flex-col px-6 py-6">
        <div className="flex h-7 flex-none items-center justify-between pb-4">
          <h2 className="truncate text-xs tracking-[0.08em] text-muted-foreground">{t`Vault`}</h2>
          <Button
            data-guide-button
            variant="ghost"
            size="icon-xs"
            aria-label={t`Vault guide`}
            aria-current={guideOpen ? 'true' : undefined}
            onClick={onOpenGuide}
            className={cn(
              'rounded-md',
              guideOpen ? 'bg-card text-foreground' : 'text-muted-foreground',
            )}
          >
            <CircleHelp />
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 gap-8">
          <div className="flex w-80 min-w-0 flex-none flex-col">
            <NoteList
              folders={props.folders}
              notes={notes}
              hits={props.hits}
              query={props.query}
              filter={props.filter}
              tag={props.tag}
              openId={open?.id ?? null}
              nowMs={props.nowMs}
              onQuery={props.onQuery}
              onFilter={props.onFilter}
              onTag={props.onTag}
              onOpen={props.onOpen}
              onCreate={onCreate}
              onAddFolder={props.onAddFolder}
              onRenameFolder={props.onRenameFolder}
              onRemoveFolder={props.onRemoveFolder}
            />
          </div>
          {notes.length === 0 && open === null ? (
            loading ? (
              <p className="m-auto text-sm text-muted-foreground">{t`Reading the vault…`}</p>
            ) : (
              <div
                data-vault-empty
                className="m-auto flex max-w-xs flex-col items-center gap-5 text-center"
              >
                <Library aria-hidden className="size-8 text-muted-foreground" />
                <div className="flex flex-col gap-2">
                  <p className="text-base font-medium">{t`The vault is empty`}</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {t`Agents search here before they answer.`}
                    <br />
                    {t`The bolt on an answer files it here.`}
                    <br />
                    {t`You can write here too.`}
                  </p>
                </div>
                <Button size="sm" onClick={() => onCreate(null)}>{t`Write the first note`}</Button>
              </div>
            )
          ) : open === null ? (
            <p className="m-auto text-sm text-muted-foreground">{t`Pick a note`}</p>
          ) : (
            <NoteReader
              note={open}
              titles={titles}
              backlinks={props.backlinks}
              editing={props.editing}
              fresh={props.fresh}
              guide={isGuide(open.id)}
              savedAtMs={props.savedAtMs}
              nowMs={props.nowMs}
              onOpen={props.onOpen}
              onOpenTitle={props.onOpenTitle}
              onRemove={props.onRemove}
              onStartEdit={props.onStartEdit}
              onStopEdit={props.onStopEdit}
              onSave={props.onSave}
              onRename={props.onRename}
              onTags={props.onTags}
            />
          )}
        </div>
      </div>
    </div>
  )
}
