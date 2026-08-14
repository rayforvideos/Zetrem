import { ChevronDown } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { InputGroupButton } from '@/shared/ui/input-group'
import type { ChoicePickerProps } from './ChoicePicker.types'

export function ChoicePicker({
  icon,
  options,
  selected,
  onSelect,
  label,
  note = null,
}: ChoicePickerProps) {
  const current = options.find((option) => option.id === selected)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <InputGroupButton
          size="xs"
          className="rounded-full text-muted-foreground hover:text-foreground"
          aria-label={label}
          title={current?.hint}
        >
          {icon}
          {current?.label ?? label}
          <ChevronDown />
        </InputGroupButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{label}</DropdownMenuLabel>
        <DropdownMenuGroup>
          {options.map((option) => (
            <DropdownMenuItem key={option.id} onSelect={() => onSelect(option.id)}>
              <span className={cn(option.id === selected ? '' : 'text-muted-foreground')}>
                <span className="block text-sm">{option.label}</span>
                <span className="block text-xs leading-snug text-muted-foreground">
                  {option.hint}
                </span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        {note !== null && (
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {note}
          </DropdownMenuLabel>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
