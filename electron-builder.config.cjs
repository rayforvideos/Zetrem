/**
 * Signing happens whenever the Developer ID certificate is on this machine.
 * Notarising needs Apple's servers, so it only runs when the credentials are
 * in the environment:
 *   APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID
 * Without them the build still produces a signed dmg and zip, which open with
 * a right click on the machine that built them.
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
    "contents": [
      {
        "x": 150,
        "y": 190,
        "type": "file"
      },
      {
        "x": 390,
        "y": 190,
        "type": "link",
        "path": "/Applications"
      }
    ]
  },
  "artifactName": "${productName}-${version}-${arch}.${ext}"
}
