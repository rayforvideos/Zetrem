export type MemoryDeps = {
  // The claude home's projects directory, and the project the app has open.
  projectsDir: string
  here(): Promise<string | null>
}
