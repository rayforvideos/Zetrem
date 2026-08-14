import { useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import { pickProject, projectStore } from '@/entities/project'
import { Button } from '@/shared/ui/button'

export function ProjectPicker() {
  const project = useSyncExternalStore(projectStore.subscribe, projectStore.get, projectStore.get)

  function handleClick(): void {
    pickProject()
      .then((picked) => {
        if (picked) projectStore.set(picked)
      })
      .catch((cause: unknown) => console.error('프로젝트를 고르지 못했다', cause))
  }

  return (
    <Button
      variant="quiet"
      size="bare"
      onClick={handleClick}
      className="text-[11px]"
      style={buttonStyle}
      title={project?.path}
    >
      {project ? project.name : '프로젝트 선택'}
    </Button>
  )
}

const buttonStyle: CSSProperties = {
  maxWidth: 180,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: 'block',
}
