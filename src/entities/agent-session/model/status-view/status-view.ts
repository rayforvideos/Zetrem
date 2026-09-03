import type {
  AccountStatusState,
  ChatStatusState,
  StatusState,
} from '../status-store/status-store.types'

export function statusView(chat: ChatStatusState, account: AccountStatusState): StatusState {
  return { ...chat, ...account }
}
