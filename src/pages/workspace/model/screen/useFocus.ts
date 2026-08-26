import { useState } from 'react'

type Focus = {
  openAgentId: string | null
  addressee: string | null
  read: string[]
  pick(id: string | null): void
  address(name: string | null): void
  clearAll(): void
}

export function useFocus(): Focus {
  const [openAgentId, setOpenAgentId] = useState<string | null>(null)
  const [addressee, setAddressee] = useState<string | null>(null)
  const [read, setRead] = useState<string[]>([])

  function pick(id: string | null): void {
    setOpenAgentId(id)
    if (id === null) return
    setRead((held) => (held.includes(id) ? held : [...held, id]))
  }

  function clearAll(): void {
    setOpenAgentId(null)
    setAddressee(null)
    setRead([])
  }

  return { openAgentId, addressee, read, pick, address: setAddressee, clearAll }
}
