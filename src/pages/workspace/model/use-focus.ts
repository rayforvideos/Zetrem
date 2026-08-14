import { useState } from 'react'

type Focus = {
  openAgentId: string | null
  addressee: string | null
  pick(id: string | null): void
  address(name: string | null): void
  clearAll(): void
}

export function useFocus(): Focus {
  const [openAgentId, setOpenAgentId] = useState<string | null>(null)
  const [addressee, setAddressee] = useState<string | null>(null)

  function clearAll(): void {
    setOpenAgentId(null)
    setAddressee(null)
  }

  return {
    openAgentId,
    addressee,
    pick: setOpenAgentId,
    address: setAddressee,
    clearAll,
  }
}
