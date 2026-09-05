// Reading the disk is the one thing this cannot answer on its own: a folder
// that was removed or renamed since it was added must not reach the CLI.
export type DirDeps = {
  // The folder's real path, symlinks resolved, or null when the path is not a
  // folder that is there.
  realDir(path: string): string | null
}
