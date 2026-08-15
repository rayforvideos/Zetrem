export type NewConnector = {
  name: string
  url: string
}

export type Refusal = {
  field: 'name' | 'url'
  why: string
}
