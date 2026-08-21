/**
 * Notarising needs Apple's servers, so it only runs when credentials are in the
 * environment: either the three APPLE_ID vars, or APPLE_KEYCHAIN_PROFILE pointing
 * at a notarytool keychain profile. electron-builder resolves the credentials
 * itself from those env vars, so `notarize` only needs to be a boolean gate.
 * See docs/releasing.md for the rest.
 */
const notarising =
  (Boolean(process.env.APPLE_ID) &&
    Boolean(process.env.APPLE_APP_SPECIFIC_PASSWORD) &&
    Boolean(process.env.APPLE_TEAM_ID)) ||
  Boolean(process.env.APPLE_KEYCHAIN_PROFILE)

module.exports = {
  "appId": "com.zetrem.app",
  "productName": "Zetrem",
  "directories": {
    "output": "release"
  },
  "files": [
    "out/**",
    "package.json"
  ],
  "mac": {
    "icon": "resources/icon.icns",
    "target": [
      {
        "target": "dmg",
        "arch": [
          "arm64"
        ]
      },
      {
        "target": "zip",
        "arch": [
          "arm64"
        ]
      }
    ],
    "category": "public.app-category.developer-tools",
    "identity": process.env.CSC_NAME,
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist",
    "entitlementsInherit": "build/entitlements.mac.plist",
    "notarize": notarising
  },
  "win": {
    "icon": "resources/icon.png",
    "target": [
      {
        "target": "nsis",
        "arch": [
          "x64"
        ]
      }
    ]
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true
  },
  "dmg": {
    "title": "Zetrem ${version}",
    "background": "build/dmg-background.tiff",
    "window": {
      "width": 660,
      "height": 400
    },
    "iconSize": 128,
    "contents": [
      {
        "x": 170,
        "y": 180,
        "type": "file"
      },
      {
        "x": 490,
        "y": 180,
        "type": "link",
        "path": "/Applications"
      }
    ]
  },
  "artifactName": "${productName}-${version}-${arch}.${ext}",
  // electron-updater in the packaged app reads this to know where releases
  // live; it also makes electron-builder emit the latest*.yml metadata the
  // updater compares versions against. Publishing itself stays a manual
  // `--publish always` with a GH_TOKEN at release time.
  "publish": [
    {
      "provider": "github",
      "owner": "rayforvideos",
      "repo": "Zetrem"
    }
  ]
}
