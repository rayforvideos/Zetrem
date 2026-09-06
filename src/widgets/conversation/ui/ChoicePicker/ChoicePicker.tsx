import { ChevronDown, RotateCcw } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { read } from '@/shared/lib/say/read'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { InputGroupButton } from '@/shared/ui/input-group'
import type { ChoicePickerProps, SubChoice } from './ChoicePicker.types'
import { t } from '@lingui/core/macro'

function items(choice: Pick<SubChoice, 'options' | 'selected' | 'onSelect'>) {
  return choice.options.map((option) => (
    <DropdownMenuItem key={option.id} onSelect={() => choice.onSelect(option.id)}>
      <span className={cn(option.id !== choice.selected && 'text-muted-foreground')}>
        <span className="block text-sm">{read(option.label)}</span>
        <span className="block text-xs leading-snug text-muted-foreground">
          {read(option.hint)}
        </span>
      </span>
    </DropdownMenuItem>
  ))
}

export function ChoicePicker({
  icon,
  options,
  selected,
  onSelect,
  label,
  note = null,
  sub,
  inForce = null,
  onRestart,
}: ChoicePickerProps) {
  const current = options.find((option) => option.id === selected)
  const subCurrent = sub?.options.find((option) => option.id === sub.selected)
  // A sub-choice left on its first option says nothing; any other shows beside the main one.
  const subShown =
    sub !== undefined && subCurrent !== undefined && sub.options[0]?.id !== sub.selected
  // What the session is running on, when that is not what was picked. People
  // read the chip and nothing else, so believing you are being asked while the
  // session has everything allowed is the worst thing this chip could cause.
  const forced = inForce === null ? undefined : options.find((option) => option.id === inForce)
  const pick = current === undefined ? label : read(current.label)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <InputGroupButton
          size="xs"
          data-stale={forced === undefined ? undefined : ''}
          className={cn(
            'rounded-full',
            forced === undefined
              ? 'text-muted-foreground hover:text-foreground'
              : 'bg-removed-surface text-removed hover:bg-removed-surface hover:text-removed',
          )}
          aria-label={label}
          title={
            forced === undefined
              ? current === undefined
                ? undefined
                : read(current.hint)
              : t`The running session is on ${read(forced.label)}. Restart it to work under ${pick}.`
          }
        >
          {icon}
          {forced === undefined ? (
            pick
          ) : (
            <>
              {read(forced.label)}
              <span aria-hidden>→</span>
              {pick}
              <span className="text-removed/70">{t`(next session)`}</span>
            </>
          )}
          {subShown && (
            <>
              <span aria-hidden className="text-muted-foreground/50">
                ·
              </span>
              <span data-sub-choice className="text-muted-foreground">
                {read(subCurrent.label)}
              </span>
            </>
          )}
          <ChevronDown />
        </InputGroupButton>
      </DropdownMenuTrigger>
      {/* The menu was opened with the pointer; handing focus back to the trigger
          would leave it wearing the keyboard ring. */}
      <DropdownMenuContent
        align="start"
        className="w-64"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {forced !== undefined && onRestart !== undefined && (
          <>
            {/* First, because with the two apart every other row in this menu
                only changes what the session after this one will do. */}
            <DropdownMenuItem data-restart-now onSelect={onRestart}>
              <RotateCcw />
              <span>
                <span className="block text-sm">{t`Restart now, on ${pick}`}</span>
                <span className="block text-xs leading-snug text-muted-foreground">
                  {t`The reply in hand is dropped. Nothing already done is undone.`}
                </span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel className="text-xs text-muted-foreground">{label}</DropdownMenuLabel>
        <DropdownMenuGroup>{items({ options, selected, onSelect })}</DropdownMenuGroup>
        {sub !== undefined && subCurrent !== undefined && (
          <>
            <DropdownMenuSeparator />
            {/* One row that says the current level; the levels themselves open beside it. */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger data-sub-trigger className="gap-2 [&_svg]:size-3.5">
                {sub.icon}
                <span className="text-muted-foreground">{sub.label}</span>
                <span className="ml-auto text-sm">{read(subCurrent.label)}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent data-sub-options className="w-60">
                {items(sub)}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}
        {note !== null && (
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {note}
          </DropdownMenuLabel>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
