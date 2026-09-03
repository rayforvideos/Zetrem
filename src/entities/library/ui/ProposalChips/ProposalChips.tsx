// What a proposal names about itself besides its title and body: the folder
// it asks for, and the tags it came with. Shared by the card over the
// composer and the row in the library's own list, so the two never drift.
export function ProposalChips({ folder, tags }: { folder: string; tags: string[] }) {
  if (folder.length === 0 && tags.length === 0) return null

  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      {folder.length > 0 && (
        <span data-proposal-folder={folder} className="rounded-md bg-muted px-1.5 py-px">
          {folder}
        </span>
      )}
      {tags.map((tag) => (
        <span
          key={tag}
          data-tag={tag}
          className="max-w-full truncate rounded-md bg-muted px-1.5 py-px"
        >
          {tag}
        </span>
      ))}
    </p>
  )
}
