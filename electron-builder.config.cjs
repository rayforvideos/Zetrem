// electron-builder resolves the notarisation credentials from the environment
// itself, so `notarize` only needs to be a boolean gate.
const notarising =
  (Boolean(process.env.APPLE_ID) &&
    Boolean(process.env.APPLE_APP_SPECIFIC_PASSWORD) &&
    Boolean(process.env.APPLE_TEAM_ID)) ||
  Boolean(process.env.APPLE_KEYCHAIN_PROFILE)

module.exports = {
  appId: 'com.zetrem.app',
  productName: 'Zetrem',
  directories: {
    output: 'release',
  },
  files: ['out/**', 'package.json'],
  electronFuses: {
    runAsNode: false,
    enableNodeOptionsEnvironmentVariable: false,
    enableNodeCliInspectArguments: false,
    enableEmbeddedAsarIntegrityValidation: true,
    onlyLoadAppFromAsar: true,
    enableCookieEncryption: true,
    grantFileProtocolExtraPrivileges: false,
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
