import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
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
import { Spinner } from '@/shared/ui/spinner'
import { Textarea } from '@/shared/ui/textarea'
import { useAgentMemory } from '../../model/useAgentMemory'

const KINDS: Record<string, MessageDescriptor> = {
  project: msg`Project`,
  feedback: msg`Feedback`,
  user: msg`About you`,
  reference: msg`Reference`,
}

function kindLabel(kind: string): string {
  const known = KINDS[kind]
  return known === undefined ? kind : i18n.t(known)
}

function KindMark({ kind }: { kind: string }) {
  if (kind.length === 0) return null
  return (
    <span className="flex-none rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
      {kindLabel(kind)}
    </span>
  )
}

export function MemoryField({ active }: { active: boolean }) {
  const memory = useAgentMemory(active)
  const [dropping, setDropping] = useState(false)

  if (memory.openId !== null && memory.note !== null) {
    return (
      <Field className="rounded-2xl bg-card p-4" data-memory-pane>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={memory.close}
            className="flex-none rounded-lg text-muted-foreground"
          >
            {t`Back`}
          </Button>
          <span className="min-w-0 flex-1 truncate font-medium text-sm">{memory.note.name}</span>
          <KindMark kind={memory.note.kind} />
        </div>
        {memory.translated === null ? (
          <>
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
          </>
        ) : (
          <div data-memory-translated className="flex flex-col gap-2">
            <p className="text-muted-foreground text-sm">{memory.translated.description}</p>
            <div className="zt-scroll max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-background p-3 text-sm leading-relaxed">
              {memory.translated.body}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          {memory.translated === null && (
            <Button
              variant="outline"
              size="xs"
              disabled={memory.busy}
              onClick={memory.save}
              className="rounded-lg"
            >
              {t`Save`}
            </Button>
          )}
          <Button
            variant="ghost"
            size="xs"
            disabled={memory.busy}
            onClick={memory.translated === null ? memory.translate : memory.showOriginal}
            className="rounded-lg text-muted-foreground"
          >
            {memory.translating && <Spinner className="size-3" />}
            {memory.translating
              ? t`Translating…`
              : memory.translated === null
                ? t`Show translated`
                : t`Show original`}
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

  return (
    <Field className="rounded-2xl bg-card p-4" data-memory-pane>
      <FieldContent>
        <FieldLabel>{t`Agent memory`}</FieldLabel>
        <FieldDescription>
          {memory.entries !== null && memory.entries.length > 0
            ? t`${memory.entries.length} memories about this project. Each one is loaded into every new session.`
            : t`What the agents write down about this project shows up here, and is loaded into every new session.`}
        </FieldDescription>
      </FieldContent>
      {memory.entries !== null && memory.entries.length === 0 && (
        <p className="text-sm text-muted-foreground">{t`Nothing remembered for this project yet.`}</p>
      )}
      {memory.entries !== null && memory.entries.length > 0 && (
        <ul className="flex flex-col divide-y divide-border/60">
          {memory.entries.map((entry) => (
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
              </Button>
            </li>
          ))}
        </ul>
      )}
      {memory.said.length > 0 && (
        <span className="text-xs text-muted-foreground">{memory.said}</span>
      )}
    </Field>
  )
}
