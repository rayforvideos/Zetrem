// On disk: the kept usage report under userData.
export type Kept = {
  report: string
  atMs: number
  // The account the reading was taken for. A file written before Zetrem
  // stamped one names nobody, and nobody owns nothing.
  who: string | null
}
