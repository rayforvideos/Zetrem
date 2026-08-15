import type { Connector } from '../read-connectors/read-connectors.types'

export type { ConnectorOrigin } from '../origin/origin.types'

export type ConnectorGroup = {
  readonly key: import('../origin/origin.types').ConnectorOrigin
  readonly title: string
  readonly note: string | null
  readonly titled: boolean
  readonly connectors: Connector[]
}
