export type CredentialSnapshot = {
  readonly credentials: string | null
  readonly oauthAccount: unknown
}

export type CredentialIo = {
  readonly platform: string
  readonly user: string
  readonly configDir: string
  readonly labelPath: string
  exec(command: string, args: string[], stdin?: string): Promise<string>
  readFile(path: string): Promise<string>
  writeFile(path: string, text: string): Promise<void>
  unlink(path: string): Promise<void>
}
