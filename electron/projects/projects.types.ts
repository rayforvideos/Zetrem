import type { Project } from '@/entities/project/model/project'

// On disk: projects.json under userData. The old shape must stay readable.
// people already have; the old shape has to stay readable.
export type StoredProject = Project & {
  createdAtMs: number
  lastOpenedAtMs: number
}
