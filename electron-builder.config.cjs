/**
 * Notarising needs Apple's servers, so it only runs when credentials are in the
 * environment: either the three APPLE_ID vars, or APPLE_KEYCHAIN_PROFILE pointing
 * at a notarytool keychain profile. electron-builder resolves the credentials
 * itself from those env vars, so `notarize` only needs to be a boolean gate.
 * Without them the build still produces a dmg, unsigned and unnotarised.
 */
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
  // The binary is signed, so what it is willing to run has to be pinned too. Off
  // goes every way of using the app as a Node runtime for somebody else's code:
  // ELECTRON_RUN_AS_NODE, NODE_OPTIONS, --inspect. On goes the check that the
  // app inside the asar is the one that was signed, and that nothing outside the
  // asar is loaded in its place. The dev run is unpackaged and never sees these.
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
  // electron-updater in the packaged app reads this to know where releases
  // live; it also makes electron-builder emit the latest*.yml metadata the
  // updater compares versions against. On a tag the Windows installer is
  // published by CI; the mac one is published from wherever the signing
  // certificate is, with `--publish always` and a GH_TOKEN.
  publish: [
    {
      provider: 'github',
      owner: 'rayforvideos',
      repo: 'Zetrem',
      // A draft is invisible to anyone not signed in, and the download page
      // reads the public list, so a draft release is a release nobody gets.
      // Every release so far has gone out as a prerelease; this says so.
      releaseType: 'prerelease',
    },
  ],
}
