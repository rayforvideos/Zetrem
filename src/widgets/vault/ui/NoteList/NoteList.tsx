import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { MoreHorizontal, Plus, Search } from 'lucide-react'
import type { VaultNoteSummary } from '@/entities/vault'
import { cn } from '@/shared/lib/cn'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Input } from '@/shared/ui/input'
import { NoteRow } from '../NoteRow/NoteRow'
import type { VaultFilter } from '../VaultPane/VaultPane.types'
import type { NoteListProps } from './NoteList.types'

const FIELD = 'h-6 min-w-0 flex-1 rounded-md border-0 bg-card px-2 text-xs shadow-none md:text-xs'
const REVEALED =
  'flex-none rounded-md text-muted-foreground opacity-0 group-hover/folder:opacity-100 group-focus-within/folder:opacity-100'

export function NoteList({
  folders,
  notes,
  hits,
  query,
  filter,
  tag,
  openId,
  nowMs,
  onQuery,
  onFilter,
  onTag,
  onOpen,
  onCreate,
  onAddFolder,
  onRenameFolder,
  onRemoveFolder,
}: NoteListProps) {
  const [naming, setNaming] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [asking, setAsking] = useState<string | null>(null)

  const tags = [...new Set(notes.flatMap((one) => one.tags))].sort()
  const shown = notes.filter(
    (one) =>
      (filter === 'all' || one.source === filter) && (tag === null || one.tags.includes(tag)),
  )
  const root = shown.filter((one) => one.folder === '')

  function chip(label: string, pressed: boolean, onClick: () => void, hook?: string) {
    return (
      <Button
        key={hook ?? label}
        data-filter-chip={hook ?? label}
        variant="ghost"
        size="xs"
        aria-pressed={pressed}
        onClick={onClick}
        className={cn(
          'h-6 rounded-full px-2.5 font-normal',
          pressed ? 'bg-card text-foreground' : 'text-muted-foreground hover:bg-card/60',
        )}
      >
        {label}
      </Button>
    )
  }

  const filters: [VaultFilter, string][] = [
    ['all', t`All`],
    ['agent', t`Agent`],
    ['person', t`Mine`],
  ]

  const rows = (inside: VaultNoteSummary[]) =>
    inside.map((note) => (
      <NoteRow
        key={note.id}
        note={note}
        snippet={null}
        open={note.id === openId}
        nowMs={nowMs}
        onOpen={onOpen}
      />
    ))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative flex-none">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          data-vault-search
          type="search"
          value={query}
          aria-label={t`Search the vault`}
          placeholder={t`Search`}
          onChange={(event) => onQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onQuery('')
          }}
          className="h-8 rounded-lg border-0 bg-card pl-8 text-sm shadow-none md:text-sm"
        />
      </div>
      <div data-filter-chips className="flex flex-none flex-wrap gap-1">
        {filters.map(([value, label]) =>
          chip(label, filter === value, () => onFilter(value), value),
        )}
        {tags.length > 0 && <span aria-hidden className="mx-1 w-px self-stretch bg-border" />}
        {tags.map((one) =>
          chip(one, tag === one, () => onTag(tag === one ? null : one), `tag:${one}`),
        )}
      </div>
      <div className="zt-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-2">
        {hits !== null ? (
          hits.length === 0 ? (
            <p className="px-2 py-4 text-xs text-muted-foreground">{t`Nothing matches`}</p>
          ) : (
            <div data-hits className="flex flex-col gap-0.5">
              {hits.map((hit) => (
                <NoteRow
                  key={hit.id}
                  note={hit}
                  snippet={hit.snippet}
                  open={hit.id === openId}
                  nowMs={nowMs}
                  onOpen={onOpen}
                />
              ))}
            </div>
          )
        ) : (
          <>
            {root.length > 0 && <div className="flex flex-col gap-0.5">{rows(root)}</div>}
            {folders.map(({ name }) => {
              const inside = shown.filter((one) => one.folder === name)
              const empty = notes.every((one) => one.folder !== name)
              return (
                <section
                  key={name}
                  data-folder={name}
                  className="group/folder flex flex-col gap-0.5"
                >
                  <h3
                    className={cn(
                      'flex h-6 items-center gap-1.5 px-2 text-xs tracking-[0.08em]',
                      empty ? 'text-muted-foreground/60' : 'text-muted-foreground',
                    )}
                  >
                    {renaming === name ? (
                      <Input
                        autoFocus
                        defaultValue={name}
                        aria-label={t`Rename folder`}
                        onFocus={(event) => event.target.select()}
                        onBlur={() => setRenaming(null)}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') setRenaming(null)
                          if (event.key !== 'Enter') return
                          event.preventDefault()
                          const wanted = event.currentTarget.value.trim()
                          setRenaming(null)
                          if (wanted.length > 0 && wanted !== name) onRenameFolder(name, wanted)
                        }}
                        className={FIELD}
                      />
                    ) : (
                      <>
                        <span className="min-w-0 truncate">{name}</span>
                        {inside.length > 0 && (
                          <span className="ml-auto flex-none tabular-nums">{inside.length}</span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={t`New note in ${name}`}
                          onClick={() => onCreate(name)}
                          className={REVEALED}
                        >
                          <Plus />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              data-folder-menu={name}
                              data-removable={empty ? 'true' : 'false'}
                              variant="ghost"
                              size="icon-xs"
                              aria-label={t`More options for the folder ${name}`}
                              className={REVEALED}
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onSelect={() => setRenaming(name)}>
                              {t`Rename`}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={!empty}
                              onSelect={() => setAsking(name)}
                            >
                              {t`Delete folder`}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </h3>
                  {rows(inside)}
                </section>
              )
            })}
          </>
        )}
      </div>
      <div className="flex h-8 flex-none items-center gap-1">
        {naming ? (
          <Input
            autoFocus
            aria-label={t`Folder name`}
            placeholder={t`Folder name`}
            onBlur={() => setNaming(false)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setNaming(false)
              if (event.key !== 'Enter') return
              event.preventDefault()
              const wanted = event.currentTarget.value.trim()
              setNaming(false)
              if (wanted.length > 0) onAddFolder(wanted)
            }}
            className="h-8 w-full min-w-0 rounded-lg border-0 bg-card px-2 text-sm shadow-none md:text-sm"
          />
        ) : (
          <>
            <Button
              data-new-note
              variant="ghost"
              size="sm"
              onClick={() => onCreate(null)}
              className="min-w-0 flex-1 justify-start gap-1.5 rounded-lg px-2 text-muted-foreground"
            >
              <Plus className="size-3.5" />
              {t`New note`}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNaming(true)}
              className="min-w-0 flex-1 justify-start gap-1.5 rounded-lg px-2 text-muted-foreground"
            >
              <Plus className="size-3.5" />
              {t`New folder`}
            </Button>
          </>
        )}
      </div>
      {asking !== null && (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open) setAsking(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t`Delete the folder “${asking}”?`}</AlertDialogTitle>
              <AlertDialogDescription>
                {t`The empty folder is removed from the vault.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t`Cancel`}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onRemoveFolder(asking)
                  setAsking(null)
                }}
              >
                {t`Delete folder`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
