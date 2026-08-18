import { useSyncExternalStore } from 'react'
import { Folder } from 'lucide-react'
import { pickProject, projectStore } from '@/entities/project'
import { Button } from '@/shared/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { t } from '@lingui/core/macro'

export function ProjectPicker() {
  const project = useSyncExternalStore(projectStore.subscribe, projectStore.get, projectStore.get)

  function choose(): void {
    pickProject()
      .then((picked) => {
        if (picked) projectStore.set(picked)
      })
      .catch((cause: unknown) => console.error('could not pick a project', cause))
  }

  if (project === null) {
    return (
      <Button variant="quiet" size="bare" onClick={choose} className="zt-hit text-xs">
        {t`Choose project`}
      </Button>
    )
  }

  const home = project.path.match(/^\/Users\/[^/]+/)?.[0] ?? ''
  const short = home ? project.path.replace(home, '~') : project.path

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="quiet" size="bare" className="zt-hit max-w-[180px] truncate text-xs">
          {project.name}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2.5">
            <Folder className="mt-0.5 size-4 flex-none text-muted-foreground" />
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-sm font-medium">{project.name}</span>
              <span
                data-selectable
                className="font-mono text-xs leading-snug break-all text-muted-foreground"
              >
                {short}
              </span>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={choose} className="rounded-full">
            {t`Change folder…`}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
