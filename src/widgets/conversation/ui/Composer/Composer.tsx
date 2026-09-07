import { useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { ArrowUp, Gauge, Paperclip, Shield, Square, X } from 'lucide-react'
import { EFFORTS, MODELS, PERMISSION_MODES, modelsWith } from '@/entities/settings'
import type { EffortChoice, ModelChoice, PermissionMode } from '@/entities/claude-cli'
import { cn } from '@/shared/lib/cn'
import { modifierKey } from '@/shared/lib/platform/platform'
import { Button } from '@/shared/ui/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/shared/ui/input-group'
import { Kbd, KbdGroup } from '@/shared/ui/kbd'
import { Switch } from '@/shared/ui/switch'
import { chipOf } from '../../lib/chip/chip'
import {
  beganComposing,
  endedComposing,
  maySendNow,
  newComposer,
  sendKey,
  sent,
  takeOwed,
} from '../../lib/composer/composer'
import { ChoicePicker } from '../ChoicePicker/ChoicePicker'
import { AttachedRow } from './AttachedRow'
import type { ComposerProps } from './Composer.types'
import { t } from '@lingui/core/macro'

export function Composer({
  empty,
  busy,
  sessionLive,
  addressee,
  permissionMode,
  model,
  effort,
  runningPermissionMode,
  runningModel,
  refusedModels,
  enterSends,
  library,
  files,
  onSend,
  onPick,
  onTake,
  onDropFile,
  onStop,
  onClearAddressee,
  onPermissionMode,
  onModel,
  onEffort,
  onLibrary,
  onRestart,
}: ComposerProps) {
  // The chips have to name what is in force, not what was last picked: a
  // session started on allow-all goes on allowing everything however the
  // pickers read, and the chip is the only thing anyone looks at.
  const permission = chipOf({ wanted: permissionMode, running: runningPermissionMode })
  const models = chipOf({ wanted: model, running: runningModel })
  const [draft, setDraft] = useState('')
  const [over, setOver] = useState(false)
  const field = useRef<HTMLTextAreaElement>(null)
  const keying = useRef(newComposer())

  function clearField(): void {
    setDraft('')
    if (field.current !== null) field.current.value = ''
  }

  function submit(): void {
    const text = (field.current?.value ?? draft).trim()
    if (text.length === 0 && files.length === 0) return
    onSend(text)
    sent(keying.current)
    clearField()
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault()
    if (maySendNow(keying.current)) submit()
  }

  function handleKey(event: KeyboardEvent<HTMLTextAreaElement>): void {
    const press = {
      key: event.key,
      shift: event.shiftKey,
      alt: event.altKey,
      mod: event.metaKey || event.ctrlKey,
    }
    if (!sendKey(press, enterSends)) return
    event.preventDefault()
    if (maySendNow(keying.current)) submit()
  }

  return (
    <form
      onSubmit={handleSubmit}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={(event) => {
        // Fires on every child boundary too, so only a leave that really left.
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
        setOver(false)
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return
        event.preventDefault()
        setOver(false)
        onTake([...event.dataTransfer.files])
      }}
      className="flex flex-none flex-col gap-2"
    >
      {addressee !== null && (
        <div className="flex items-center gap-1.5 self-start rounded-full bg-card py-1 pr-1 pl-3 text-xs">
          <span>{t`To ${addressee}`}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onClearAddressee}
            aria-label={t`Clear`}
            className="rounded-full text-muted-foreground"
          >
            <X />
          </Button>
        </div>
      )}
      <InputGroup
        data-over={over || undefined}
        className="rounded-3xl border-border bg-card p-1.5 shadow-none data-[over]:border-foreground/40 dark:bg-card"
      >
        <AttachedRow files={files} onRemove={onDropFile} />
        <InputGroupTextarea
          ref={field}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onCompositionStart={() => beganComposing(keying.current)}
          onCompositionEnd={() => {
            if (!endedComposing(keying.current)) return
            // The key may come back on its own and send first; this only runs if it did not.
            window.setTimeout(() => {
              if (takeOwed(keying.current)) submit()
            }, 0)
          }}
          onKeyDown={handleKey}
          onPaste={(event) => {
            const dropped = [...event.clipboardData.files]
            if (dropped.length === 0) return
            event.preventDefault()
            onTake(dropped)
          }}
          aria-label={addressee !== null ? t`Message for ${addressee}` : t`Message your team`}
          placeholder={
            addressee !== null
              ? t`Task for ${addressee}`
              : empty
                ? t`What should they work on?`
                : t`Keep going`
          }
          rows={1}
          className="max-h-40 min-h-11 py-2.5 text-base"
          autoFocus
        />
        <InputGroupAddon align="block-end" className="@container/composer gap-1.5 px-1.5 pb-1.5">
          <InputGroupButton
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onPick}
            aria-label={t`Attach a file`}
            className="rounded-full text-muted-foreground"
          >
            <Paperclip />
          </InputGroupButton>
          <ChoicePicker
            icon={<Shield />}
            options={PERMISSION_MODES}
            selected={permission.pick}
            inForce={permission.inForce}
            onRestart={onRestart}
            onSelect={(id) => onPermissionMode(id as PermissionMode)}
            label={t`Permissions`}
          />
          {/* A switch, not a button: every other control on this row opens
              something, while this one is a setting whose state has to be
              legible without pressing it to find out. */}
          <label
            title={t`Agents search the library and suggest what they find.`}
            className={cn(
              'flex h-6 min-w-0 flex-none select-none items-center gap-1.5 rounded-full px-2 text-sm transition-colors duration-150',
              library ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Switch
              data-library-toggle
              size="sm"
              checked={library}
              onCheckedChange={onLibrary}
              aria-label={library ? t`Library on` : t`Library off`}
            />
            {/* The words go first when the row runs short: the switch still says
                on or off by itself, and the button at the end must stay in the box. */}
            <span data-library-words className="hidden @[34rem]/composer:inline">
              {library ? t`Library on` : t`Library off`}
            </span>
          </label>
          <ChoicePicker
            options={modelsWith(MODELS, refusedModels)}
            selected={models.pick}
            inForce={models.inForce}
            onRestart={onRestart}
            onSelect={(id) => onModel(id as ModelChoice)}
            label={t`Model`}
            sub={{
              icon: <Gauge />,
              label: t`Effort`,
              options: EFFORTS,
              selected: effort,
              onSelect: (id) => onEffort(id as EffortChoice),
            }}
            note={
              sessionLive
                ? t`The running session keeps its model and effort. This applies from the next one.`
                : null
            }
          />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {/* The key hint is a nicety; on a narrow pane it would collide with the button. */}
            <span className="hidden @[30rem]/composer:contents">
              {enterSends ? (
                <Kbd>Enter</Kbd>
              ) : (
                <KbdGroup>
                  <Kbd>{modifierKey()}</Kbd>
                  <Kbd>Enter</Kbd>
                </KbdGroup>
              )}
            </span>
            {busy ? (
              <InputGroupButton
                size="icon-sm"
                variant="default"
                onClick={onStop}
                aria-label={t`Stop`}
                className="rounded-full"
              >
                <Square />
              </InputGroupButton>
            ) : (
              <InputGroupButton
                type="submit"
                size="icon-sm"
                variant="default"
                disabled={draft.trim().length === 0 && files.length === 0}
                aria-label={t`Send`}
                className="rounded-full"
              >
                <ArrowUp />
              </InputGroupButton>
            )}
          </div>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
