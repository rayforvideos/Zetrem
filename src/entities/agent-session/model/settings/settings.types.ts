import type { FaceId } from '@/entities/user'
import type { ModelChoice, PermissionMode } from '../run-config/run-config.types'

export type Settings = {
  permissionMode: PermissionMode
  model: ModelChoice
  refusedModels: ModelChoice[]
  userName: string
  userFace: FaceId
  setupDone: boolean
  onboarded: boolean
  hintsSeen: string[]
  knownTools: string[]
  knownAgents: string[]
  stockAgents: string[]
  tongue: 'system' | 'en' | 'ko'
  notify: boolean
  sidebarOpen: boolean
  sidebarWidth: number
}
