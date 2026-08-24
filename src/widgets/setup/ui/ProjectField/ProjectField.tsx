import { Button } from '@/shared/ui/button'
import { Field, FieldLabel } from '@/shared/ui/field'
import type { Project } from '../SetupPane/SetupPane.types'
import { t } from '@lingui/core/macro'

export function ProjectField({ project }: { project: Project }) {
  return (
    <Field>
      <FieldLabel className="text-muted-foreground">{t`Project`}</FieldLabel>
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
          {project.chosen ? t`Change` : t`Choose folder`}
        </Button>
      </div>
      {project.recent.length > 0 && (
        <div data-recent className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{t`Recent`}</span>
          {project.recent.map((one) => (
            <Button
              key={one.path}
              size="sm"
              variant="ghost"
              title={one.path}
              onClick={() => project.onPickRecent(one.path)}
              className="rounded-full font-mono text-xs text-muted-foreground"
            >
              {one.name}
            </Button>
          ))}
        </div>
      )}
    </Field>
  )
}
