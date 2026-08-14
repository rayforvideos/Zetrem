import type { ChildTurnEvent } from '../child.types'
import type { PermissionEvent } from '../permission.types'
import type { StatusEvent } from '../status/status.types'
import type { TurnEvent } from '../turn.types'

export type { PermissionAlwaysResult, PermissionResult } from '../permission.types'

export type ClaudeTurnEvent = TurnEvent | ChildTurnEvent | PermissionEvent | StatusEvent
