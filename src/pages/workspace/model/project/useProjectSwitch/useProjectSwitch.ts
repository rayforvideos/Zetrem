import { useRef } from 'react'
import { t } from '@lingui/core/macro'
import { forgetProject, openProject, pickProject, projectStore } from '@/entities/project'
import type { Project } from '@/entities/project'
import type { ProjectSwitch, SwitchDeps } from './useProjectSwitch.types'

// Moving between projects: adopt, open by id, forget. The session rooted in
// the old folder keeps running under its own chat, and is saved there — a
// project switch does not stop it.
export function useProjectSwitch(deps: SwitchDeps): ProjectSwitch {
  const { project, allProjects, refreshProjects, report } = deps

  function adopt(picked: Project | null): void {
    // Two projects may share one folder, so identity is the id, not the path.
    if (!picked || picked.id === project?.id) return
    projectStore.set(picked)
  }

  function pick(): void {
    pickProject().then(adopt).catch(report(t`Could not open that folder`))
  }

  // Two quick clicks: only the last one decides what the screen shows.
  const opening = useRef(0)
  function open(id: string): void {
    const ticket = ++opening.current
    openProject(id)
      .then((picked) => {
        if (opening.current === ticket) adopt(picked)
      })
      .catch(report(t`Could not open that folder`))
  }

  function forget(id: string): void {
    const current = project !== null && project.id === id
    forgetProject(id)
      .then(async () => {
        if (current) {
          const next = allProjects.filter((one) => one.id !== id)[0]
          const opened = next === undefined ? null : await openProject(next.id)
          projectStore.set(opened)
        }
        refreshProjects()
      })
      .catch(report(t`Could not remove that project`))
  }

  return { pick, open, forget }
}
