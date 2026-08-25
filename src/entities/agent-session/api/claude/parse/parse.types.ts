import type { ChildTurnEvent } from '../child/child.types'
import type { PermissionEvent } from '../permission/permission.types'
import type { StatusEvent } from '../status/status.types'
import type { TurnEvent } from '../turn/turn.types'

export type { PermissionAlwaysResult, PermissionResult } from '../permission/permission.types'

export type ClaudeTurnEvent = TurnEvent | ChildTurnEvent | PermissionEvent | StatusEvent
