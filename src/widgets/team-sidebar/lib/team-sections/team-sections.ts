import type { TeamMember } from '../team/team.types'
import type { TeamSections } from './team-sections.types'

export function sectionsOf(members: TeamMember[]): TeamSections {
  const shared: TeamMember[] = []
  const project: TeamMember[] = []
  for (const member of members) {
    if (member.origin === 'project') project.push(member)
    else shared.push(member)
  }
  return { shared, project }
}
