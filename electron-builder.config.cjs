/**
 * Notarising needs Apple's servers, so it only runs when the credentials are in
 * the environment. See docs/releasing.md for the rest.
 */
const notarising =
  Boolean(process.env.APPLE_ID) &&
  Boolean(process.env.APPLE_APP_SPECIFIC_PASSWORD) &&
  Boolean(process.env.APPLE_TEAM_ID)

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
    "notarize": notarising ? { "teamId": process.env.APPLE_TEAM_ID } : false
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
  "extraResources": [
    {
      "from": "resources/icon.png",
      "to": "icon.png"
    }
  ],
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
  "artifactName": "${productName}-${version}-${arch}.${ext}"
}
