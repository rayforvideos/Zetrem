import { execFile } from 'node:child_process'
import { readFile, unlink } from 'node:fs/promises'
import { homedir, userInfo } from 'node:os'
import { join } from 'node:path'
import { lost, won } from '@/shared/lib/outcome/outcome'
import type { Outcome } from '@/shared/lib/outcome/outcome.types'
import { saveSecretFile } from '../../store/save-file/save-file'
import {
  configDirOf,
  labelPathOf,
  oauthAccountOf,
  withOauthAccount,
} from './claude-json/claude-json'
import type { CredentialIo, CredentialSnapshot } from './credentials.types'

export const KEYCHAIN_SERVICE = 'Claude Code-credentials'

function credentialsPath(io: CredentialIo): string {
  return join(io.configDir, '.credentials.json')
}

async function readOr(io: CredentialIo, path: string): Promise<string | null> {
  return io.readFile(path).catch(() => null)
}

// `security find-generic-password` exits 44 when there is no such item, and
// with something else when it could not make the read: a denied prompt, a
// locked keychain. Both used to answer "nothing kept", and the caller then
// read a .credentials.json claude had left behind, which can name an older
// account. Only the first is nothing kept.
const NO_SUCH_ITEM = 44

function exitOf(cause: unknown): unknown {
  return cause === null || typeof cause !== 'object' ? null : (cause as { code?: unknown }).code
}

function saidBy(cause: unknown): string {
  return cause instanceof Error ? cause.message.trim() : String(cause)
}

async function keychainRead(io: CredentialIo): Promise<Outcome<string | null>> {
  try {
    const out = await io.exec('security', [
      'find-generic-password',
      '-s',
      KEYCHAIN_SERVICE,
      '-a',
      io.user,
      '-w',
    ])
    const text = out.trim()
    return won(text.length > 0 ? text : null)
  } catch (cause: unknown) {
    if (exitOf(cause) === NO_SUCH_ITEM) return won(null)
    return lost('failed', saidBy(cause))
  }
}

async function keychainForget(io: CredentialIo): Promise<void> {
  await io
    .exec('security', ['delete-generic-password', '-s', KEYCHAIN_SERVICE, '-a', io.user])
    .catch(() => '')
}

// `security` asks for the secret when -w carries no value and reads it from
// stdin, twice, so the tokens never appear in the process list. It reads one
// line and answers 0 even when the two did not match, so the item is read back
// before the argument form — the only one that carries a newline — is used.
async function keychainWrite(io: CredentialIo, credentials: string): Promise<boolean> {
  const ask = ['add-generic-password', '-U', '-s', KEYCHAIN_SERVICE, '-a', io.user, '-w']
  if (!credentials.includes('\n')) {
    const asked = await io
      .exec('security', ask, `${credentials}\n${credentials}\n`)
      .then(() => true)
      .catch(() => false)
    const back = await keychainRead(io)
    if (asked && back.ok && back.value === credentials) return true
  }
  return io
    .exec('security', [...ask, credentials])
    .then(() => true)
    .catch(() => false)
}

// The file stands in for the item where there is no item at all, and on the
// platforms that keep no keychain. It never stands in for an item that could
// not be read: answering with it is answering with another account.
export async function readSnapshot(io: CredentialIo): Promise<Outcome<CredentialSnapshot>> {
  const fromKeychain = io.platform === 'darwin' ? await keychainRead(io) : won<string | null>(null)
  if (!fromKeychain.ok) return fromKeychain
  const credentials = fromKeychain.value ?? (await readOr(io, credentialsPath(io)))
  return won({ credentials, oauthAccount: oauthAccountOf(await readOr(io, io.labelPath)) })
}

export async function writeSnapshot(io: CredentialIo, snapshot: CredentialSnapshot): Promise<void> {
  const { credentials } = snapshot
  const darwin = io.platform === 'darwin'
  let keychained = false
  if (darwin && credentials !== null) {
    keychained = await keychainWrite(io, credentials)
    // A kept item would win over the file that is about to stand in for it.
    if (!keychained) await keychainForget(io)
  }
  if (darwin && credentials === null) await keychainForget(io)
  // On macOS the tokens belong in the keychain alone: a file beside it is a
  // plainer second copy, and an old one is read in preference to the item.
  if (credentials === null || keychained)
    await io.unlink(credentialsPath(io)).catch(() => undefined)
  else await io.writeFile(credentialsPath(io), credentials)
  const before = await readOr(io, io.labelPath)
  await io.writeFile(io.labelPath, withOauthAccount(before, snapshot.oauthAccount))
}

export function realIo(): CredentialIo {
  return {
    platform: process.platform,
    user: userInfo().username,
    configDir: configDirOf(process.env, homedir()),
    labelPath: labelPathOf(process.env, homedir()),
    exec(command, args, stdin) {
      return new Promise<string>((resolve, reject) => {
        const child = execFile(
          command,
          args,
          { windowsHide: true, timeout: 20_000 },
          (cause, stdout) => (cause === null ? resolve(stdout) : reject(cause)),
        )
        child.stdin?.end(stdin ?? '')
      })
    },
    readFile: (path) => readFile(path, 'utf8'),
    writeFile: (path, text) => saveSecretFile(path, text),
    unlink,
  }
}
