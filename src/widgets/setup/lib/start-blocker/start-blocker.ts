import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'

export function startBlocker(signedIn: boolean, hasProject: boolean): MessageDescriptor | null {
  if (signedIn && hasProject) return null
  if (!signedIn && !hasProject) return msg`Sign in and choose a project folder`
  return signedIn ? msg`Choose a project folder` : msg`Sign in to your Anthropic account`
}
