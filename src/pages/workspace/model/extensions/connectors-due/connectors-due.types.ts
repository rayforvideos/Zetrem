// What a listing of connectors was asked for. Claude reads them in the
// project's folder and holds its own per account, so both decide the answer.
export type ConnectorsAskedFor = {
  project: string | null
  account: number
}
