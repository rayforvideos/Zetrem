import type { PluginScope, PluginVerb } from '../../api/catalog/catalog.types'

const INSTALLED: PluginScope[] = ['user', 'project', 'managed']

const ALLOWS: Partial<Record<PluginVerb, PluginScope[]>> = {
  uninstall: ['user', 'project'],
  enable: ['user', 'project'],
  disable: ['user', 'project'],
  update: INSTALLED,
}

export function withScope(args: string[], verb: PluginVerb, scope: unknown): string[] {
  const allowed = ALLOWS[verb]
  if (allowed === undefined) return args
  const from = allowed.find((known) => known === scope)
  return from === undefined ? args : [...args, '--scope', from]
}
