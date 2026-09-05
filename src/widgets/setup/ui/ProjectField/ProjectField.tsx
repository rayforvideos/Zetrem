import { FolderPlus, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/shared/ui/field'
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
              key={one.id}
              size="sm"
              variant="ghost"
              title={one.path}
              onClick={() => project.onPickRecent(one.id)}
              className="rounded-full font-mono text-xs text-muted-foreground"
            >
              {one.name}
            </Button>
          ))}
        </div>
      )}
      {/* Extra folders hang on the project, so they are only worth showing
          once there is a project for them to hang on. */}
      {project.chosen && <ExtraDirs project={project} />}
    </Field>
  )
}

function ExtraDirs({ project }: { project: Project }) {
  return (
    <div data-extra-dirs className="flex flex-col gap-2">
      <FieldLabel className="text-muted-foreground">{t`Extra folders`}</FieldLabel>
      <FieldDescription>
        {t`Folders outside the project your team may also read and write, such as a sibling package or a folder of specs.`}
      </FieldDescription>
      {project.extraDirs.map((path) => (
        <div key={path} className="flex items-center gap-2">
          <span
            title={path}
            className="min-w-0 flex-1 truncate rounded-xl bg-card px-3.5 py-2 font-mono text-sm"
          >
            {path}
          </span>
          <Button
            size="sm"
            variant="ghost"
            aria-label={t`Remove ${path}`}
            onClick={() => project.onRemoveDir(path)}
            className="flex-none rounded-full text-muted-foreground"
          >
            <X />
          </Button>
        </div>
      ))}
      <div>
        <Button size="sm" variant="secondary" onClick={project.onAddDir} className="rounded-full">
          <FolderPlus />
          {t`Add folder`}
        </Button>
      </div>
    </div>
  )
}
