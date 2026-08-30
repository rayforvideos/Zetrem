import type { CredentialSnapshot } from '../../cli/credentials/credentials.types'

export type KeptAccount = {
  id: string
  // Empty for a login filed before .claude.json caught up with its name.
  email: string
  orgName: string | null
  // The name that was showing when this login was filed, and so the one name
  // it must not take: the file repeating it is the lag, not the answer.
  notNamed?: string
  // The file's own name for the login, kept best-effort. It lags a real
  // sign-in by many seconds and is absent when the login was filed before it
  // caught up, so the live email is identity and this never decides who a row
  // is.
  accountUuid?: string
  seenAt: number
}

export type AccountsIndex = {
  version: 1
  activeId: string | null
  accounts: KeptAccount[]
}

export type Cipher = {
  encrypt(text: string): Buffer
  decrypt(data: Buffer): string
}

export type AccountsStore = {
  load(): Promise<AccountsIndex>
  save(index: AccountsIndex): Promise<void>
  readSlot(id: string): Promise<CredentialSnapshot | null>
  writeSlot(id: string, snapshot: CredentialSnapshot): Promise<void>
  removeSlot(id: string): Promise<void>
}
