import type { Project } from '@/entities/project/model/project'

// On disk: projects.json under userData, read by readMemory() in projects.ts.
// A change here is a change to a file people already have; read the old shape too.
export type StoredProject = Project & {
  createdAtMs: number
  lastOpenedAtMs: number
}
