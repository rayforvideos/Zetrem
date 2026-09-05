import { isEnvName } from '@/entities/settings'

// Shells write variable names in upper case and people type them either way, so
// what is typed is folded before it is judged. Trimming matters too: a name
// pasted out of a terminal usually arrives with a space on one end.
export function tidyEnvName(typed: string): string {
  return typed.trim().toUpperCase()
}

// A name is added only if it could ever be read back: a bare upper-case name,
// and not one already on the list. Refusing here rather than on save keeps the
// screen honest, since a name that fails this is dropped when settings are read
// and would vanish without a word.
export function canAddEnv(names: readonly string[], name: string): boolean {
  return isEnvName(name) && !names.includes(name)
}
