import { useState } from 'react'
import { alreadyHeld, heavyLine, kindOf, nameOf, tooHeavy } from '@/entities/attachment'
import type { Attached } from '@/entities/attachment'
import { toast } from 'sonner'

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
      .catch(() => toast.error('Could not read what you attached'))
  }

  function pick(): void {
    void window.desk
      .pickFiles()
      .then(fromPaths)
      .catch(() => toast.error('Could not open the file picker'))
  }

  function take(dropped: File[]): void {
    const paths: string[] = []
    const pasted: Promise<Attached>[] = []
    for (const one of dropped) {
      const path = window.desk.pathForFile(one)
      if (path.length > 0) {
        paths.push(path)
        continue
      }
      const name = one.name.length > 0 ? one.name : `pasted-${Date.now()}.png`
      pasted.push(
        readAsBase64(one).then((data) => ({
          path: `clipboard:${name}`,
          name: nameOf(name),
          kind: kindOf(name),
          bytes: one.size,
          mediaType: one.type.length > 0 ? one.type : null,
          data,
        })),
      )
    }
    fromPaths(paths)
    if (pasted.length > 0) {
      void Promise.all(pasted)
        .then(keep)
        .catch(() => toast.error('Could not read what you pasted'))
    }
  }

  function drop(path: string): void {
    setFiles((held) => held.filter((file) => file.path !== path))
  }

  return { files, pick, take, drop, clear: () => setFiles([]) }
}
