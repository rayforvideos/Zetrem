export type Dated = {
  path: string
  at: number
  // Filed under a folder somebody named. Filing says keep, so these sit
  // outside the cap entirely: they are never dropped, and they never crowd an
  // unfiled chat out either.
  filed: boolean
}
