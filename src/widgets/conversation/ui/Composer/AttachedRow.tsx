import { FileText, X } from 'lucide-react'
import type { Attached } from '@/entities/attachment'
import { Button } from '@/shared/ui/button'

export function AttachedRow({
  files,
  onRemove,
}: {
  files: Attached[]
  onRemove(path: string): void
}) {
  if (files.length === 0) return null

  return (
    <div data-attached={files.length} className="flex w-full flex-wrap justify-start gap-1.5 px-1.5 pt-1.5">
      {files.map((file) => (
        <span
          key={file.path}
          data-file={file.kind}
          className="flex items-center gap-2 rounded-xl bg-muted py-1 pr-1 pl-1.5 text-xs"
        >
          {file.kind === 'image' && file.data !== null ? (
            <img
              src={`data:${file.mediaType};base64,${file.data}`}
              alt={file.name}
              className="size-7 rounded-lg object-cover"
            />
          ) : (
            <span className="flex size-7 items-center justify-center rounded-lg bg-card text-muted-foreground">
              <FileText className="size-3.5" />
            </span>
          )}
          <span className="max-w-[168px] truncate">{file.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onRemove(file.path)}
            aria-label={`Remove ${file.name}`}
            className="rounded-full text-muted-foreground"
          >
            <X />
          </Button>
        </span>
      ))}
    </div>
  )
}
