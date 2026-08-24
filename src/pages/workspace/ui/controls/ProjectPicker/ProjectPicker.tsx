import { useSyncExternalStore } from 'react'
import { Folder } from 'lucide-react'
import type { Project } from '@/entities/project'
import { projectStore } from '@/entities/project'
import { Button } from '@/shared/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { t } from '@lingui/core/macro'

function tilde(path: string): string {
  const home = path.match(/^\/Users\/[^/]+/)?.[0] ?? ''
  return home ? path.replace(home, '~') : path
}

export function ProjectSheet({
  project,
  recent,
  onPick,
  onChoose,
}: {
  project: Project
  recent: Project[]
  onPick(path: string): void
  onChoose(): void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5">
        <Folder className="mt-0.5 size-4 flex-none text-muted-foreground" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm font-medium">{project.name}</span>
          <span
            data-selectable
            className="font-mono text-xs leading-snug break-all text-muted-foreground"
          >
            {tilde(project.path)}
          </span>
        </div>
      </div>
      {recent.length > 0 && (
        <div data-recent className="flex flex-col gap-0.5">
          <span className="px-1 text-xs text-muted-foreground">{t`Recent`}</span>
          {recent.map((one) => (
            <Button
              key={one.path}
              variant="ghost"
              onClick={() => onPick(one.path)}
              className="h-auto min-w-0 flex-col items-start gap-0.5 rounded-lg px-2 py-1.5 text-left"
            >
              <span className="max-w-full truncate text-sm">{one.name}</span>
              <span className="max-w-full truncate font-mono text-xs text-muted-foreground">
                {tilde(one.path)}
              </span>
            </Button>
          ))}
        </div>
      )}
      <Button size="sm" variant="secondary" onClick={onChoose} className="rounded-full">
        {t`Change folder…`}
      </Button>
    </div>
  )
}

// Choosing has to run through the owner: a project change must reset the
// live agent first, and only WorkspaceScreen holds it.
export function ProjectPicker({
  recent,
  onPick,
  onChoose,
}: {
  recent: Project[]
  onPick(path: string): void
  onChoose(): void
}) {
  const project = useSyncExternalStore(projectStore.subscribe, projectStore.get, projectStore.get)

  if (project === null) {
    return (
      <Button variant="quiet" size="bare" onClick={onChoose} className="zt-hit text-xs">
        {t`Choose project`}
      </Button>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="quiet" size="bare" className="zt-hit max-w-[180px] truncate text-xs">
          {project.name}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <ProjectSheet project={project} recent={recent} onPick={onPick} onChoose={onChoose} />
      </PopoverContent>
    </Popover>
  )
}
