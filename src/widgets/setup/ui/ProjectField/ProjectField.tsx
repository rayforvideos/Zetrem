import { Button } from '@/shared/ui/button'
import { Field, FieldLabel } from '@/shared/ui/field'
import type { Project } from '../SetupPane/SetupPane.types'

export function ProjectField({ project }: { project: Project }) {
  return (
    <Field>
      <FieldLabel className="text-muted-foreground">Project</FieldLabel>
      <div className="flex flex-wrap items-center gap-3">
        {project.chosen && (
          <span className="min-w-0 flex-1 truncate rounded-xl bg-card px-3.5 py-2.5 font-mono text-sm">
            {project.chosen.path}
          </span>
        )}
        <Button
          size="sm"
          variant={project.chosen ? 'secondary' : 'default'}
          onClick={project.onChoose}
          className="rounded-full"
        >
          {project.chosen ? 'Change' : 'Choose folder'}
        </Button>
      </div>
    </Field>
  )
}
