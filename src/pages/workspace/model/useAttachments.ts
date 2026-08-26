import { useState } from 'react'
import { alreadyHeld, heavyLine, kindOf, nameOf, tooHeavy } from '@/entities/attachment'
import type { Attached } from '@/entities/attachment'
import { toast } from 'sonner'
import { t } from '@lingui/core/macro'

type Attachments = {
  files: Attached[]
  pick(): void
  take(dropped: File[]): void
  drop(path: string): void
  clear(): void
}

function readAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('could not read that file'))
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.readAsDataURL(blob)
  })
}

// Resolving a dropped file also tells main the path came from the OS, so every
// one of them has to be admitted before anything asks to read it.
function admitted(dropped: File[]): Promise<{ file: File; path: string }[]> {
  return Promise.all(
    dropped.map(async (file) => ({ file, path: await window.desk.pathForFile(file) })),
  )
}

export function useAttachments(): Attachments {
  const [files, setFiles] = useState<Attached[]>([])

  function keep(found: Attached[]): void {
    setFiles((held) => {
      const next = [...held]
      for (const file of found) {
        if (alreadyHeld(next, file.path)) continue
        if (tooHeavy(file)) {
          toast.error(heavyLine(file.name))
          next.push({ ...file, data: null })
          continue
        }
        next.push(file)
      }
      return next
    })
  }

  function fromPaths(paths: string[]): void {
    if (paths.length === 0) return
    void window.desk
      .readFiles(paths)
      .then(keep)
      .catch(() => toast.error(t`Could not read what you attached`))
  }

  function pick(): void {
    void window.desk
      .pickFiles()
      .then(fromPaths)
      .catch(() => toast.error(t`Could not open the file picker`))
  }

  function take(dropped: File[]): void {
    void admitted(dropped)
      .then((seen) => {
        const paths: string[] = []
        const pasted: Promise<Attached>[] = []
        for (const { file, path } of seen) {
          if (path.length > 0) {
            paths.push(path)
            continue
          }
          const name = file.name.length > 0 ? file.name : `pasted-${Date.now()}.png`
          pasted.push(
            readAsBase64(file).then((data) => ({
              path: `clipboard:${name}`,
              name: nameOf(name),
              kind: kindOf(name),
              bytes: file.size,
              mediaType: file.type.length > 0 ? file.type : null,
              data,
            })),
          )
        }
        fromPaths(paths)
        if (pasted.length > 0) {
          void Promise.all(pasted)
            .then(keep)
            .catch(() => toast.error(t`Could not read what you pasted`))
        }
      })
      .catch(() => toast.error(t`Could not read what you attached`))
  }

  function drop(path: string): void {
    setFiles((held) => held.filter((file) => file.path !== path))
  }

  return { files, pick, take, drop, clear: () => setFiles([]) }
}
