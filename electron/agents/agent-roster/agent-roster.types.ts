// The two folders a roster is read out of. `project` is null when no project
// is open: there is nowhere for a project's own people to live, so that scope
// is simply not there.
export type RosterDirs = {
  user: string
  project: string | null
}
