import { useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { ArrowUp, Shield, Square, X } from 'lucide-react'
import { MODELS, PERMISSION_MODES, modelsWith } from '@/entities/agent-session'
import type { ModelChoice, PermissionMode } from '@/entities/agent-session'
import { modifierKey } from '@/shared/lib/platform/platform'
import { Button } from '@/shared/ui/button'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@/shared/ui/input-group'
import { Kbd, KbdGroup } from '@/shared/ui/kbd'
import { beganComposing, endedComposing, maySendNow, newComposer, sent } from '../../lib/composer/composer'
import { ChoicePicker } from '../ConversationPane/ChoicePicker'
import type { ComposerProps } from './Composer.types'

export function Composer({
  empty,
  busy,
  sessionLive,
  addressee,
  permissionMode,
  model,
  refusedModels,
  onSend,
  onStop,
  onClearAddressee,
  onPermissionMode,
  onModel,
}: ComposerProps) {
  const [draft, setDraft] = useState('')
  const field = useRef<HTMLTextAreaElement>(null)
  const keying = useRef(newComposer())

  function clearField(): void {
    setDraft('')
    if (field.current !== null) field.current.value = ''
  }

  function submit(): void {
    const text = (field.current?.value ?? draft).trim()
    if (text.length === 0) return
    onSend(text)
    sent(keying.current)
    clearField()
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault()
    if (maySendNow(keying.current)) submit()
  }

  function handleKey(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return
    event.preventDefault()
    if (maySendNow(keying.current)) submit()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-none flex-col gap-2">
      {addressee !== null && (
        <div className="flex items-center gap-1.5 self-start rounded-full bg-card py-1 pr-1 pl-3 text-xs">
          <span>To {addressee}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onClearAddressee}
            aria-label="Clear"
            className="rounded-full text-muted-foreground"
          >
            <X />
          </Button>
        </div>
      )}
      <InputGroup className="rounded-3xl border-border bg-card p-1.5 shadow-none dark:bg-card">
        <InputGroupTextarea
          ref={field}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onCompositionStart={() => beganComposing(keying.current)}
          onCompositionEnd={() => {
            if (endedComposing(keying.current)) window.setTimeout(submit, 0)
          }}
          onKeyDown={handleKey}
          aria-label={addressee !== null ? `Message for ${addressee}` : 'Message your team'}
          placeholder={
            addressee !== null
              ? `Task for ${addressee}`
              : empty
                ? 'What should they work on?'
                : 'Keep going'
          }
          rows={1}
          className="max-h-40 min-h-11 py-2.5 text-base"
          autoFocus
        />
        <InputGroupAddon align="block-end" className="gap-1.5 px-1.5 pb-1.5">
          <ChoicePicker
            icon={<Shield />}
            options={PERMISSION_MODES}
            selected={permissionMode}
            onSelect={(id) => onPermissionMode(id as PermissionMode)}
            label="Permissions"
          />
          <ChoicePicker
            options={modelsWith(MODELS, refusedModels)}
            selected={model}
            onSelect={(id) => onModel(id as ModelChoice)}
            label="Model"
            note={
              sessionLive
                ? 'The running session keeps its model. This applies from the next one.'
                : null
            }
          />
          <div className="ml-auto flex items-center gap-2">
            <KbdGroup>
              <Kbd>{modifierKey()}</Kbd>
              <Kbd>Enter</Kbd>
            </KbdGroup>
            {busy ? (
              <InputGroupButton
                size="icon-sm"
                variant="default"
                onClick={onStop}
                aria-label="Stop"
                className="rounded-full"
              >
                <Square />
              </InputGroupButton>
            ) : (
              <InputGroupButton
                type="submit"
                size="icon-sm"
                variant="default"
                disabled={draft.trim().length === 0}
                aria-label="Send"
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
