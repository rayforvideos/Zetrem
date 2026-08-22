# Releasing

A release is a tag. Pushing one builds both installers; the Windows one is
published by CI, and the macOS one is published from wherever the signing
certificate lives, which is somebody's laptop.

The download page and the in-app updater both read the public release list, and
the page only offers a release that carries **both** installers. A release with
one of them is a release nobody is offered.

## Cutting one

```sh
# on master, with the tree clean and the checks green
npm run typecheck && npm test && npm run build

# the version is the release
npm version 1.0.0-beta.5 --no-git-tag-version
git commit -am "chore: v1.0.0-beta.5"
git tag -a v1.0.0-beta.5 -m "v1.0.0-beta.5"
git push origin master v1.0.0-beta.5
```

The tag starts the Platforms workflow. It packages on both platforms, and on a
tag it uploads `Zetrem-<version>-x64.exe`, its blockmap, and `latest.yml` to the
release, creating the release as a prerelease if it does not exist yet.

## The macOS half

Signing and notarising need a certificate and Apple's servers, so they happen
where the certificate is. Once per machine:

**1. A Developer ID Application certificate.** Not "Apple Development", which
cannot be notarised. It needs an Apple Developer Program membership.

- Keychain Access → Certificate Assistant → Request a Certificate From a
  Certificate Authority → save to disk
- developer.apple.com/account/resources/certificates → + → Developer ID
  Application → upload the request → download → double-click to install

```sh
security find-identity -v -p codesigning | grep "Developer ID Application"
```

**2. Notary credentials.** An app-specific password from appleid.apple.com →
Sign-In and Security → App-Specific Passwords, stored once under a name:

```sh
xcrun notarytool store-credentials zetrem \
  --apple-id you@example.com --team-id TEAMID --password abcd-efgh-ijkl-mnop
```

Then, for each release:

```sh
export CSC_NAME="Developer ID Application: Your Name (TEAMID)"
export APPLE_KEYCHAIN_PROFILE=zetrem
GH_TOKEN=$(gh auth token) npm run package:mac -- --publish always
```

That uploads the dmg, the zip and `latest-mac.yml` to the same release. The
download page picks the new version up on its own, at build time and again in
the browser, so nothing there needs a deploy.

Without those two variables the build still runs and still produces a dmg: it is
unsigned and unnotarised, Gatekeeper will refuse to open it on anyone else's
machine, and `notarize` stays off because the config gates on the credentials
being present. Do not publish that one.

## Checking what went out

```sh
gh release view v1.0.0-beta.5 --json assets --jq '.assets[].name'
codesign -dv --verbose=4 release/mac-universal/Zetrem.app
spctl -a -t open --context context:primary-signature -v release/Zetrem-*.dmg
xcrun stapler validate release/Zetrem-*.dmg
```

Six assets is the whole set: dmg, zip, exe, two blockmaps, and the two
`latest*.yml` the updater compares versions against.
