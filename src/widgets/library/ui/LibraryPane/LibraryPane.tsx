import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { CircleHelp, Library, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { NoteList } from '../NoteList/NoteList'
import { NoteReader } from '../NoteReader/NoteReader'
import type { LibraryPaneProps } from './LibraryPane.types'

const ICON = 'rounded-md text-muted-foreground hover:text-foreground'

export function LibraryPane(props: LibraryPaneProps) {
  const { notes, open, loading, onCreate, sidebar } = props
  const titles = new Set(notes.map((one) => one.title))
  const [naming, setNaming] = useState(false)

  // What the library is, in a person's words. The agent gets its own
  // instructions from the library's MCP server; this is not that.
  const help = (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          data-guide-button
          variant="ghost"
          size="icon-xs"
          aria-label={t`About the library`}
          className={ICON}
        >
          <CircleHelp />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 text-sm leading-6">
        <p className="font-medium">{t`What the library is`}</p>
        <p className="mt-2 text-muted-foreground">
          {t`What this project has learned, kept as notes so nobody has to work it out twice.`}
        </p>
        <p className="mt-2 text-muted-foreground">
          {t`While the library button under the message box is on, agents search here and file what they find.`}
        </p>
        <p className="mt-2 text-muted-foreground">
          {t`“To library” under an answer files it here. You can write here yourself.`}
        </p>
      </PopoverContent>
    </Popover>
  )

  const add = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button data-new-menu variant="ghost" size="icon-xs" aria-label={t`New`} className={ICON}>
          <Plus />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onSelect={() => onCreate('')}>{t`New note`}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setNaming(true)}>{t`New folder`}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div data-library-pane className="relative z-[3] flex h-full gap-7">
      {sidebar}
      <div className="zt-rise flex w-full min-w-0 flex-1 flex-col px-6 py-6">
        <div className="flex min-h-0 flex-1 gap-8">
          <div className="flex w-80 min-w-0 flex-none flex-col">
            <div className="flex h-7 flex-none items-center justify-between pb-4">
              <h2 className="flex items-baseline gap-1.5 truncate text-xs tracking-[0.08em] text-muted-foreground">
                {t`Library`}
                {notes.length > 0 && (
                  <span data-note-count className="tabular-nums text-muted-foreground/60">
                    {notes.length}
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-0.5">
                {add}
                {help}
              </div>
            </div>
            <NoteList
              folders={props.folders}
              notes={notes}
              hits={props.hits}
              query={props.query}
              tag={props.tag}
              openId={open?.id ?? null}
              nowMs={props.nowMs}
              naming={naming}
              onNamed={() => setNaming(false)}
              onQuery={props.onQuery}
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
              <p className="m-auto text-sm text-muted-foreground">{t`Reading the library…`}</p>
            ) : (
              <div
                data-library-empty
                className="m-auto flex max-w-xs flex-col items-center gap-5 text-center"
              >
                <Library aria-hidden className="size-8 text-muted-foreground" />
                <div className="flex flex-col gap-2">
                  <p className="text-base font-medium">{t`No notes yet`}</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {t`“To library” under an answer files it here.`}
                    <br />
                    {t`Agents file what they learn while the library button is on.`}
                    <br />
                    {t`Or start with one of your own.`}
                  </p>
                </div>
                <Button size="sm" onClick={() => onCreate('')}>{t`Write the first note`}</Button>
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
              guide={false}
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
