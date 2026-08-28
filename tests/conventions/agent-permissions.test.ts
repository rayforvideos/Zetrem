import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import config from '../../electron-builder.config.cjs'

// macOS charges what a child process does to the app that spawned it. An agent
// Zetrem runs may reach for another app, a folder, the camera or the local
// network, and macOS only asks the person when Zetrem has declared that
// category: the hardened-runtime entitlement lets the question be asked, and
// the Info.plist sentence is what the dialog says. Missing either, the request
// is refused with no dialog. These lists are the categories an agent can reach.

const ENTITLEMENTS = [
  'com.apple.security.cs.allow-jit',
  'com.apple.security.automation.apple-events',
  'com.apple.security.device.audio-input',
  'com.apple.security.device.camera',
  'com.apple.security.device.bluetooth',
  'com.apple.security.device.usb',
  'com.apple.security.personal-information.location',
  'com.apple.security.personal-information.addressbook',
  'com.apple.security.personal-information.calendars',
  'com.apple.security.personal-information.photos-library',
]

// Each one only loosens this binary; the CLI runs under its own signature, so
// none of them would reach an agent, and each is a reason for Gatekeeper to
// look harder at the app.
const RUNTIME_EXCEPTIONS = [
  'com.apple.security.cs.allow-unsigned-executable-memory',
  'com.apple.security.cs.allow-dyld-environment-variables',
  'com.apple.security.cs.disable-library-validation',
  'com.apple.security.cs.debugger',
  'com.apple.security.get-task-allow',
]

const USAGE_KEYS = [
  'NSAppleEventsUsageDescription',
  'NSDocumentsFolderUsageDescription',
  'NSDesktopFolderUsageDescription',
  'NSDownloadsFolderUsageDescription',
  'NSRemovableVolumesUsageDescription',
  'NSNetworkVolumesUsageDescription',
  'NSFileProviderDomainUsageDescription',
  'NSSystemAdministrationUsageDescription',
  'NSLocalNetworkUsageDescription',
  'NSCameraUsageDescription',
  'NSMicrophoneUsageDescription',
  'NSAudioCaptureUsageDescription',
  'NSScreenCaptureUsageDescription',
  'NSBluetoothAlwaysUsageDescription',
  'NSBluetoothPeripheralUsageDescription',
  'NSLocationUsageDescription',
  'NSSpeechRecognitionUsageDescription',
  'NSContactsUsageDescription',
  'NSCalendarsUsageDescription',
  'NSCalendarsFullAccessUsageDescription',
  'NSRemindersUsageDescription',
  'NSRemindersFullAccessUsageDescription',
  'NSPhotoLibraryUsageDescription',
]

function trueKeys(plist: string): string[] {
  return [...plist.matchAll(/<key>([^<]+)<\/key>\s*<true\/>/g)].map(([, key]) => key)
}

describe('the app declares every permission an agent it runs might need', () => {
  const plist = readFileSync('build/entitlements.mac.plist', 'utf8')
  const granted = trueKeys(plist)

  it('asks for each resource-access entitlement, and JIT', () => {
    expect(granted.sort()).toEqual([...ENTITLEMENTS].sort())
  })

  it('asks for no runtime exception beyond JIT', () => {
    expect(granted.filter((key) => RUNTIME_EXCEPTIONS.includes(key))).toEqual([])
  })

  it('signs the helpers with the same file', () => {
    expect(config.mac.entitlementsInherit).toBe(config.mac.entitlements)
    expect(config.mac.entitlements).toBe('build/entitlements.mac.plist')
    expect(config.mac.hardenedRuntime).toBe(true)
  })

  it('gives every dialog a sentence that names the agents', () => {
    const usage = config.mac.extendInfo as Record<string, string>
    expect(Object.keys(usage).sort()).toEqual([...USAGE_KEYS].sort())
    for (const [key, sentence] of Object.entries(usage)) {
      expect(sentence, key).toMatch(/^Zetrem lets the agents it runs .+ when you ask them to\.$/)
    }
  })
})
