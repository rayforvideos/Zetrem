import type { Project } from '@/entities/project'

export type ProjectsProps = {
  current: Project | null
  all: Project[]
  onOpen(id: string): void
  onPickFolder(): void
  onForget(id: string): void
}
