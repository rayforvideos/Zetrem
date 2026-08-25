import { useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { ArrowUp, Paperclip, Shield, Square, X } from 'lucide-react'
import { MODELS, PERMISSION_MODES, modelsWith } from '@/entities/agent-session'
import type { ModelChoice, PermissionMode } from '@/entities/agent-session'
import { modifierKey } from '@/shared/lib/platform/platform'
import { Button } from '@/shared/ui/button'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@/shared/ui/input-group'
import { Kbd, KbdGroup } from '@/shared/ui/kbd'
import { beganComposing, endedComposing, maySendNow, newComposer, sendKey, sent, takeOwed } from '../../lib/composer/composer'
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
  refusedModels,
  enterSends,
  files,
  onSend,
  onPick,
  onTake,
  onDropFile,
  onStop,
  onClearAddressee,
  onPermissionMode,
  onModel,
}: ComposerProps) {
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
            // The key may come back on its own and send first; this only runs
            // if it did not.
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
        <InputGroupAddon align="block-end" className="gap-1.5 px-1.5 pb-1.5">
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
            selected={permissionMode}
            onSelect={(id) => onPermissionMode(id as PermissionMode)}
            label={t`Permissions`}
          />
          <ChoicePicker
            options={modelsWith(MODELS, refusedModels)}
            selected={model}
            onSelect={(id) => onModel(id as ModelChoice)}
            label={t`Model`}
            note={
              sessionLive
                ? t`The running session keeps its model. This applies from the next one.`
                : null
            }
          />
          <div className="ml-auto flex items-center gap-2">
            {enterSends ? (
              <Kbd>Enter</Kbd>
            ) : (
              <KbdGroup>
                <Kbd>{modifierKey()}</Kbd>
                <Kbd>Enter</Kbd>
              </KbdGroup>
            )}
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
