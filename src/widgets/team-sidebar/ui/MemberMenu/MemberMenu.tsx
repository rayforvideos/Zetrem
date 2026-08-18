import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { t } from '@lingui/core/macro'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

export function MemberMenu({
  name,
  onEdit,
  onRelease,
}: {
  name: string
  onEdit(): void
  onRelease(): void
}) {
  const [asking, setAsking] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t`More for ${name}`}
            className="rounded-md text-muted-foreground opacity-0 group-hover/member:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={onEdit}>{t`Edit`}</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => setAsking(true)}>
              {t`Remove from team`}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t`Remove ${name}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {t`Their file is deleted and they leave the roster. A session already running keeps them until it ends. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t`Cancel`}</AlertDialogCancel>
            <AlertDialogAction onClick={onRelease}>{t`Remove`}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
