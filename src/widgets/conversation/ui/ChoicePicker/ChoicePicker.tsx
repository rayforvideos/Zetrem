import { ChevronDown } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { read } from '@/shared/lib/say/read'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { InputGroupButton } from '@/shared/ui/input-group'
import type { ChoicePickerProps, SubChoice } from './ChoicePicker.types'

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
}: ChoicePickerProps) {
  const current = options.find((option) => option.id === selected)
  const subCurrent = sub?.options.find((option) => option.id === sub.selected)
  // A sub-choice left on its first option says nothing; any other shows beside the main one.
  const subShown =
    sub !== undefined && subCurrent !== undefined && sub.options[0]?.id !== sub.selected
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <InputGroupButton
          size="xs"
          className="rounded-full text-muted-foreground hover:text-foreground"
          aria-label={label}
          title={current === undefined ? undefined : read(current.hint)}
        >
          {icon}
          {current === undefined ? label : read(current.label)}
          {subShown && (
            <span data-sub-choice className="flex items-center gap-1 text-muted-foreground">
              {sub.icon}
              {read(subCurrent.label)}
            </span>
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
        <DropdownMenuLabel className="text-xs text-muted-foreground">{label}</DropdownMenuLabel>
        <DropdownMenuGroup>{items({ options, selected, onSelect })}</DropdownMenuGroup>
        {sub !== undefined && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground [&_svg]:size-3.5">
              {sub.icon}
              {sub.label}
            </DropdownMenuLabel>
            <DropdownMenuGroup data-sub-options>{items(sub)}</DropdownMenuGroup>
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
