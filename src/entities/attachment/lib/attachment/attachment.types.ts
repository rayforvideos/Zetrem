export type AttachKind = 'image' | 'file'

export type Attached = {
  path: string
  name: string
  kind: AttachKind
  bytes: number
  mediaType: string | null
  data: string | null
}

export type Sent = { name: string; kind: AttachKind; path: string }
