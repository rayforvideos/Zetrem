export type Project = {
  id: string
  path: string
  name: string
  // Folders outside the project the session is also given, remembered with the
  // project because they answer "this project, and what else": a monorepo
  // sibling, a spec folder. Absent on a project remembered before they existed.
  extraDirs?: string[]
}
