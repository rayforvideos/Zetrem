export type NewConnector = {
  name: string
  url: string
}

export type RefusalCode =
  | 'name-empty'
  | 'name-long'
  | 'name-dash'
  | 'name-chars'
  | 'name-taken'
  | 'url-empty'
  | 'url-shape'
  | 'url-scheme'
  | 'url-insecure'
  | 'garbled'

export type Refusal = {
  field: 'name' | 'url'
  code: RefusalCode
}
