import { useState } from 'react'
import { ChevronRight, Folder, FolderOpen, MoreHorizontal } from 'lucide-react'
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { t } from '@lingui/core/macro'
import type { ProjectsProps } from './ProjectSwitcher.types'

export function tilde(path: string): string {
  const home = path.match(/^\/Users\/[^/]+/)?.[0] ?? ''
  return home ? path.replace(home, '~') : path
}

export function baseName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path
}

// One folder is one project, so this row is the whole of the filing: it names
// the project you are in, carries rename and remove for it, and opens onto the
// other projects, a new one, and the folder picker.
export function ProjectSwitcher({ projects }: { projects: ProjectsProps }) {
  const [open, setOpen] = useState(false)
  const [asking, setAsking] = useState(false)

  const current = projects.current

  if (current === null) {
    return (
      <Button
        variant="ghost"
        size="bare"
        onClick={projects.onPickFolder}
        className="h-9 w-full min-w-0 justify-start gap-2 rounded-lg px-2 text-left text-sm font-medium"
      >
        <FolderOpen className="size-4 flex-none text-muted-foreground" />
        <span className="truncate">{t`Choose project`}</span>
      </Button>
    )
  }

  const elsewhere = projects.all.filter((one) => one.id !== current.id)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col gap-0.5">
      <div className="group/project relative">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="bare"
            title={tilde(current.path)}
            className="h-8 w-full min-w-0 justify-start gap-2 rounded-lg px-2 text-left text-sm font-medium"
          >
            <Folder className="size-3.5 flex-none text-muted-foreground" />
            <span className="truncate">{current.name}</span>
            <ChevronRight
              className={cn(
                'size-3 flex-none text-muted-foreground transition-transform',
                open && 'rotate-90',
              )}
            />
          </Button>
        </CollapsibleTrigger>
        <div
          className={cn(
            'absolute inset-y-0 right-0 flex items-center rounded-r-lg pr-1 pl-4',
            'bg-linear-to-l from-card from-60% to-transparent',
            'opacity-0 group-hover/project:opacity-100 group-focus-within/project:opacity-100',
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t`More for ${current.name}`}
                className="rounded-md text-muted-foreground"
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem variant="destructive" onSelect={() => setAsking(true)}>
                {t`Remove project`}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CollapsibleContent>
        <div className="flex flex-col gap-0.5">
          {elsewhere.map((one) => (
            <Button
              key={one.id}
              variant="ghost"
              size="bare"
              title={tilde(one.path)}
              onClick={() => {
                setOpen(false)
                projects.onOpen(one.id)
              }}
              className="h-8 w-full min-w-0 justify-start gap-2 rounded-lg px-2 text-left text-sm text-muted-foreground"
            >
              <Folder className="size-3.5 flex-none" />
              <span className="truncate">{one.name}</span>
            </Button>
          ))}
          <Button
            variant="ghost"
            size="bare"
            onClick={() => {
              setOpen(false)
              projects.onPickFolder()
            }}
            className="h-8 w-full min-w-0 justify-start gap-2 rounded-lg px-2 text-left text-sm text-muted-foreground"
          >
            <FolderOpen className="size-3.5 flex-none" />
            <span className="truncate">{t`Open folder…`}</span>
          </Button>
        </div>
      </CollapsibleContent>

      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent>
          <AlertDialogTitle>{t`Remove ${current.name}?`}</AlertDialogTitle>
          <AlertDialogHeader>
            <AlertDialogDescription>
              {t`The project leaves this list. The folder and everything in it stay on disk.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t`Cancel`}</AlertDialogCancel>
            <AlertDialogAction onClick={() => projects.onForget(current.id)}>
              {t`Remove`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Collapsible>
  )
}

