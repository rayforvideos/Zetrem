// electron-builder resolves the notarisation credentials from the environment
// itself, so `notarize` only needs to be a boolean gate.
const notarising =
  (Boolean(process.env.APPLE_ID) &&
    Boolean(process.env.APPLE_APP_SPECIFIC_PASSWORD) &&
    Boolean(process.env.APPLE_TEAM_ID)) ||
  Boolean(process.env.APPLE_KEYCHAIN_PROFILE)

// macOS charges what a child process does to the app that spawned it, so when
// an agent Zetrem started reaches for the camera, a folder or another app, the
// dialog macOS shows carries Zetrem's name and one of these sentences. A
// category with no sentence is refused with no dialog (Apple events, the local
// network) or, for the camera and microphone, ends the process. The person
// still says yes or no; this only lets the question be asked.
const reason = (doing) => `Zetrem lets the agents it runs ${doing} when you ask them to.`
const usage = {
  NSAppleEventsUsageDescription: reason('control other apps'),
  NSDocumentsFolderUsageDescription: reason('read and change files in your Documents folder'),
  NSDesktopFolderUsageDescription: reason('read and change files on your Desktop'),
  NSDownloadsFolderUsageDescription: reason('read and change files in your Downloads folder'),
  NSRemovableVolumesUsageDescription: reason('read and change files on removable drives'),
  NSNetworkVolumesUsageDescription: reason('read and change files on network volumes'),
  NSFileProviderDomainUsageDescription: reason('read and change files in cloud-synced folders'),
  NSSystemAdministrationUsageDescription: reason('change system settings'),
  NSLocalNetworkUsageDescription: reason('connect to servers and devices on your local network'),
  NSCameraUsageDescription: reason('use the camera'),
  NSMicrophoneUsageDescription: reason('use the microphone'),
  NSAudioCaptureUsageDescription: reason('record system audio'),
  NSScreenCaptureUsageDescription: reason('capture the screen'),
  NSBluetoothAlwaysUsageDescription: reason('use Bluetooth devices'),
  // iOS-only, but Electron's Info.plist ships a stock sentence under it.
  NSBluetoothPeripheralUsageDescription: reason('use Bluetooth devices'),
  NSLocationUsageDescription: reason('use your location'),
  NSSpeechRecognitionUsageDescription: reason('use speech recognition'),
  NSContactsUsageDescription: reason('read your contacts'),
  NSCalendarsUsageDescription: reason('read and update your calendars'),
  NSCalendarsFullAccessUsageDescription: reason('read and update your calendars'),
  NSRemindersUsageDescription: reason('read and update your reminders'),
  NSRemindersFullAccessUsageDescription: reason('read and update your reminders'),
  NSPhotoLibraryUsageDescription: reason('read and add to your photo library'),
}

module.exports = {
  appId: 'com.zetrem.app',
  productName: 'Zetrem',
  directories: {
    output: 'release',
  },
  files: [
    'out/**',
    'package.json',
    'node_modules/node-mac-permissions/**',
    'node_modules/bindings/**',
    'node_modules/file-uri-to-path/**',
  ],
  asarUnpack: ['**/*.node'],
  electronFuses: {
    runAsNode: false,
    enableNodeOptionsEnvironmentVariable: false,
    enableNodeCliInspectArguments: false,
    enableEmbeddedAsarIntegrityValidation: true,
    onlyLoadAppFromAsar: true,
    enableCookieEncryption: true,
    // Stays on: the renderer is a file:// page inside app.asar, and this is the
    // privilege that lets file:// read from the archive. With it off the
    // packaged window opens on ERR_FILE_NOT_FOUND (seen on both platforms).
    grantFileProtocolExtraPrivileges: true,
  },
  mac: {
    icon: 'resources/icon.icns',
    target: [
      {
        target: 'dmg',
        arch: ['universal'],
      },
      {
        target: 'zip',
        arch: ['universal'],
      },
    ],
    category: 'public.app-category.developer-tools',
    extendInfo: usage,
    identity: process.env.CSC_NAME,
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    notarize: notarising,
  },
  win: {
    icon: 'resources/icon.png',
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
  dmg: {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: electron-builder fills these in itself, so a template literal would hand it the answer instead of the question
    title: 'Zetrem ${version}',
    background: 'build/dmg-background.tiff',
    window: {
      width: 660,
      height: 400,
    },
    iconSize: 128,
    contents: [
      {
        x: 170,
        y: 180,
        type: 'file',
      },
      {
        x: 490,
        y: 180,
        type: 'link',
        path: '/Applications',
      },
    ],
  },
  // biome-ignore lint/suspicious/noTemplateCurlyInString: electron-builder fills these in itself, so a template literal would hand it the answer instead of the question
  artifactName: '${productName}-${version}-${arch}.${ext}',
  // What makes electron-builder emit the latest*.yml the updater reads.
  publish: [
    {
      provider: 'github',
      owner: 'rayforvideos',
      repo: 'Zetrem',
      // A draft is invisible to anyone not signed in.
      releaseType: 'prerelease',
    },
  ],
}
