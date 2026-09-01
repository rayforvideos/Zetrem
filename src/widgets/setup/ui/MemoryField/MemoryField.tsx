import { useEffect, useState } from 'react'
import { t } from '@lingui/core/macro'
import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import { ArrowDownUp, ArrowLeft } from 'lucide-react'
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
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import { cn } from '@/shared/lib/cn'
import { arrangedEntries, dayGap, kindsOf } from '../../lib/memory-list/memory-list'
import type { MemoryKindPick, MemorySort } from '../../lib/memory-list/memory-list.types'
import { useAgentMemory } from '../../model/useAgentMemory'

const KINDS: Record<string, MessageDescriptor> = {
  project: msg`Project`,
  feedback: msg`Feedback`,
  user: msg`About you`,
  reference: msg`Reference`,
}

// One muted tint per kind so the list can be scanned by color alone; the
// pairs live in global.css beside added/removed and flip with the scheme.
const KIND_TINTS: Record<string, string> = {
  feedback: 'bg-kind-feedback-surface text-kind-feedback',
  project: 'bg-kind-project-surface text-kind-project',
  user: 'bg-kind-user-surface text-kind-user',
  reference: 'bg-kind-reference-surface text-kind-reference',
}

function kindLabel(kind: string): string {
  const known = KINDS[kind]
  return known === undefined ? kind : i18n.t(known)
}

function KindMark({ kind }: { kind: string }) {
  if (kind.length === 0) return null
  return (
    <span
      className={cn(
        'flex-none rounded-full px-2 py-0.5 text-xs',
        KIND_TINTS[kind] ?? 'bg-accent text-muted-foreground',
      )}
    >
      {kindLabel(kind)}
    </span>
  )
}

function agoLabel(updated: number): string {
  if (updated <= 0) return ''
  const gap = dayGap(updated, Date.now())
  if (gap === 0) return t`Today`
  if (gap === 1) return t`Yesterday`
  if (gap < 7) return t`${gap} days ago`
  return new Intl.DateTimeFormat(i18n.locale, { month: 'short', day: 'numeric' }).format(updated)
}

export function MemoryField({ active }: { active: boolean }) {
  const memory = useAgentMemory(active)
  const [dropping, setDropping] = useState(false)
  const [kind, setKind] = useState<MemoryKindPick>('all')
  const [sort, setSort] = useState<MemorySort>('recent')

  const opened = memory.openId !== null && memory.note !== null
  const { close } = memory
  useEffect(() => {
    if (!opened) return
    // preventDefault keeps the pane's own Escape handler from also closing
    // the settings: it ignores events already claimed (see SetupPane).
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      close()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [opened, close])

  if (memory.openId !== null && memory.note !== null) {
    return (
      <Field className="rounded-2xl bg-card p-4" data-memory-pane>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={memory.close}
            className="flex-none rounded-lg"
            data-memory-back
          >
            <ArrowLeft />
            {t`Back`}
          </Button>
          <span className="min-w-0 flex-1 truncate font-medium text-sm">{memory.note.name}</span>
          <KindMark kind={memory.note.kind} />
        </div>
        <Input
          value={memory.note.description}
          onChange={(event) => memory.editDescription(event.target.value)}
          placeholder={t`One line the agent reads to decide whether this matters`}
          aria-label={t`Description`}
          className="text-sm"
        />
        <Textarea
          value={memory.note.body}
          onChange={(event) => memory.editBody(event.target.value)}
          spellCheck={false}
          aria-label={t`Memory body`}
          className="zt-scroll h-64 resize-none bg-background p-3 text-sm leading-relaxed"
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="xs"
            disabled={memory.busy}
            onClick={memory.save}
            className="rounded-lg"
          >
            {t`Save`}
          </Button>
          <Button
            variant="ghost"
            size="xs"
            disabled={memory.busy}
            onClick={() => setDropping(true)}
            className="rounded-lg text-muted-foreground"
          >
            {t`Forget`}
          </Button>
          {memory.said.length > 0 && (
            <span className="text-xs text-muted-foreground">{memory.said}</span>
          )}
        </div>
        <AlertDialog open={dropping} onOpenChange={setDropping}>
          <AlertDialogContent data-memory-confirm>
            <AlertDialogHeader>
              <AlertDialogTitle>{t`Forget this memory?`}</AlertDialogTitle>
              <AlertDialogDescription>
                {t`The file is deleted and its line leaves the index the agents load. This cannot be undone.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t`Keep it`}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  memory.remove()
                  setDropping(false)
                }}
              >
                {t`Forget`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Field>
    )
  }

  const entries = memory.entries ?? []
  const kinds = kindsOf(entries)
  const picked = kind !== 'all' && !kinds.includes(kind) ? 'all' : kind
  const shown = arrangedEntries(entries, picked, sort)

  return (
    <Field className="rounded-2xl bg-card p-4" data-memory-pane>
      <FieldContent>
        <FieldLabel>{t`Agent memory`}</FieldLabel>
        <FieldDescription>
          {entries.length > 0
            ? t`${entries.length} memories about this project. Each one is loaded into every new session.`
            : t`What the agents write down about this project shows up here, and is loaded into every new session.`}
        </FieldDescription>
      </FieldContent>
      {memory.entries !== null && entries.length === 0 && (
        <p className="text-sm text-muted-foreground">{t`Nothing remembered for this project yet.`}</p>
      )}
      {entries.length > 0 && (
        <>
          {kinds.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5" data-memory-filters>
              {['all', ...kinds].map((one) => (
                <Button
                  key={one}
                  variant={picked === one ? 'default' : 'secondary'}
                  size="xs"
                  onClick={() => setKind(one)}
                  className="rounded-full"
                  data-memory-filter={one}
                >
                  {one === 'all' ? t`All` : kindLabel(one)}
                  <span className={picked === one ? undefined : 'text-muted-foreground'}>
                    {one === 'all'
                      ? entries.length
                      : entries.filter((entry) => entry.kind === one).length}
                  </span>
                </Button>
              ))}
              <span className="flex-1" />
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setSort(sort === 'recent' ? 'name' : 'recent')}
                className="rounded-lg text-muted-foreground"
                data-memory-sort={sort}
              >
                <ArrowDownUp />
                {sort === 'recent' ? t`Recent first` : t`By name`}
              </Button>
            </div>
          )}
          <ul className="flex flex-col divide-y divide-border/60">
            {shown.map((entry) => (
              <li key={entry.id} data-memory-row={entry.id}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => memory.open(entry.id)}
                  className="h-auto w-full items-center justify-start gap-3 rounded-lg px-2 py-2.5 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-sm">{entry.name}</span>
                    {entry.description.length > 0 && (
                      <span className="block truncate font-normal text-muted-foreground text-xs">
                        {entry.description}
                      </span>
                    )}
                  </span>
                  <KindMark kind={entry.kind} />
                  <span className="w-14 flex-none text-right font-normal text-muted-foreground text-xs">
                    {agoLabel(entry.updated)}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
      {memory.said.length > 0 && (
        <span className="text-xs text-muted-foreground">{memory.said}</span>
      )}
    </Field>
  )
}
