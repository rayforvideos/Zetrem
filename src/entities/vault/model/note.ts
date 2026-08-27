export type VaultNoteSummary = {
  id: string
  folder: string
  title: string
  lead: string
  updatedAtMs: number
}

export type VaultNote = VaultNoteSummary & { text: string }

export type VaultFolder = {
  name: string
}

export type VaultListing = {
  folders: VaultFolder[]
  notes: VaultNoteSummary[]
}
