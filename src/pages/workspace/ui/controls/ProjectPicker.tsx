import { useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import { pickProject, projectStore } from '@/entities/project'

/** 에이전트가 일할 프로젝트. 이름이 보이는 것 자체가 "어디서 도는지" 의 답이다 */
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
    <button
      type="button"
      onClick={handleClick}
      className="zt-btn zt-btn--ghost zt-btn--sm"
      style={buttonStyle}
      title={project?.path}
    >
      {project ? project.name : '프로젝트 선택'}
    </button>
  )
}

const buttonStyle: CSSProperties = {
  maxWidth: 180,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: 'block',
}
