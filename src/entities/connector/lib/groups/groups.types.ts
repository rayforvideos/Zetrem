import type { MessageDescriptor } from '@lingui/core'
import type { Connector } from '../read-connectors/read-connectors.types'

export type { ConnectorOrigin } from '../origin/origin.types'

export type ConnectorGroup = {
  readonly key: import('../origin/origin.types').ConnectorOrigin
  readonly title: MessageDescriptor
  readonly note: MessageDescriptor | null
  readonly titled: boolean
  readonly connectors: Connector[]
}
