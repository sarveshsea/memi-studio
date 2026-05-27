# Credentials & Rotation Calendar

> Single source of truth for the secrets that ship Mémoire Studio. Check this when something stops signing/notarizing/updating, and revisit it on the dates below.

All secrets live in **`sarveshsea/memi-studio` → Settings → Secrets and Variables → Actions**.

Local developer builds intentionally do **not** require the updater private key. `npm run tauri:build` merges `src-tauri/tauri.local.conf.json`, which disables `bundle.createUpdaterArtifacts` so it emits the `.app` and `.dmg` without trying to sign the updater tarball. Release builds use `npm run tauri:build:release` and still require `TAURI_SIGNING_PRIVATE_KEY`.

## What's set today

| Name | Purpose | Source / Owner | Rotates | Where it shows up |
|---|---|---|---|---|
| `APPLE_CERTIFICATE_BASE64` | Developer ID Application .p12 (Humyn LLC), base64-encoded | Keychain Access export of the active cert | When the cert expires (see below) | `release.yml` → "Import Apple Developer ID certificate" step |
| `APPLE_CERTIFICATE_PASSWORD` | Password chosen at .p12 export time | Set once when generating the secret bundle; not re-derivable | Only on cert rotation | Same step |
| `KEYCHAIN_PASSWORD` | Random string used to create the temp build keychain in CI | Generated via `openssl rand -hex 16` | Only if compromised | Same step |
| `APPLE_SIGNING_IDENTITY` | SHA-1 hash of the active Developer ID cert (e.g. `3AF8D80…`) | `security find-identity -v -p codesigning` | On cert rotation | "Build, sign, notarize Tauri app" step |
| `APPLE_TEAM_ID` | 10-char Humyn LLC team id (`Z4ZUZ884U3`) | developer.apple.com → Membership | Never (lifetime) | Same step + notarize step |
| `APPLE_ID` | Apple ID email tied to the Humyn LLC developer account | Account email | When the email changes | Notarize step |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password from appleid.apple.com | appleid.apple.com → Sign-In and Security | **When you change your Apple ID password, OR if you revoke the app password** | Notarize step + Build step (used as `APPLE_PASSWORD` env) |
| `TAURI_SIGNING_PRIVATE_KEY` | minisign private key for the in-app updater | `npx tauri signer generate` | If lost or compromised — rotation = invalidate every installed copy's update path | "Build, sign, notarize Tauri app" step (sets the env Tauri reads) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Optional password on the minisign private key (currently empty) | Set when generating | Same as above | Same step |

## Rotation calendar

### Predictable expiries

| Item | Expires | Rotation effort | Notes |
|---|---|---|---|
| Developer ID Application cert | **2031-05-08** (5 years from issue) | ~30 min — generate new CSR, download cert, re-export .p12, update 2 secrets | Apple gives you ~3 months of overlap; rotate before the old one expires to avoid a release-day fire drill. |
| App-specific password | Never auto-expires, but invalidated when you change your Apple ID password | ~2 min — generate new at appleid.apple.com, update 1 secret | If you ever change your Apple ID password (security incident, etc.), notarization breaks until you rotate this. |
| Tauri updater private key | Never expires | If compromised: rotate immediately + ship an emergency unsigned update with a new pubkey embedded | Treat like an SSH host key — once you ship the pubkey to users, replacing it requires every user to manually install a new build. |

### Calendar reminders worth setting

Add these to your calendar:

- **2030-11-08** — "Rotate Mémoire Studio Apple Developer ID cert (~6 months before 2031-05-08 expiry)"
- **Annually on May 1** — "Audit `sarveshsea/memi-studio` secrets: any unused? Any rotated by Apple/GitHub? Run `gh secret list --repo sarveshsea/memi-studio`"

## Rotation runbooks

### Apple Developer ID Application cert (the big one)

When 2031-05-08 approaches, OR if the cert is revoked:

1. Generate a new cert
   - Keychain Access → Certificate Assistant → Request a Certificate from a CA
   - Save `CertificateSigningRequest.certSigningRequest` to disk
   - developer.apple.com → Certificates → + → Developer ID Application
   - Upload the CSR, download the `.cer`
   - Double-click to install in Keychain
2. Find the new cert's SHA-1
   ```bash
   security find-identity -v -p codesigning | grep "Developer ID Application: Humyn LLC"
   ```
   Use the **freshest** SHA (date-check with `security find-certificate -a -p -c "Developer ID Application: Humyn LLC." | openssl x509 -noout -dates`)
3. Export the cert + private key
   ```bash
   security export -k login.keychain-db -t identities -f pkcs12 -P "$NEW_PASSWORD" -o cert.p12
   base64 -i cert.p12 -o cert.p12.base64
   ```
4. Update 3 secrets via `gh`
   ```bash
   gh secret set APPLE_CERTIFICATE_BASE64 --repo sarveshsea/memi-studio < cert.p12.base64
   gh secret set APPLE_CERTIFICATE_PASSWORD --repo sarveshsea/memi-studio --body "$NEW_PASSWORD"
   gh secret set APPLE_SIGNING_IDENTITY --repo sarveshsea/memi-studio --body "$NEW_SHA1"
   ```
5. Wipe local files: `rm cert.p12 cert.p12.base64`
6. Trigger a test release: `gh workflow run release.yml --repo sarveshsea/memi-studio -f tag=<latest-tag>`

### App-specific password (most common rotation)

If you've changed your Apple ID password, or if notarization starts failing with auth errors:

1. Go to https://appleid.apple.com/account/manage → Sign-In and Security → App-Specific Passwords
2. Revoke the old "memi-studio notarization" password
3. Generate a new one with the same label
4. `gh secret set APPLE_APP_SPECIFIC_PASSWORD --repo sarveshsea/memi-studio --body "<new-xxxx-xxxx-xxxx-xxxx>"`
5. Re-trigger the most recent release to verify

### Tauri updater private key (rare but high-stakes)

If the private key leaks or is suspected compromised:

1. Generate a new keypair
   ```bash
   npx @tauri-apps/cli signer generate -w /tmp/new-updater.key
   ```
2. Update tauri.conf.json `plugins.updater.pubkey` to the new public key
3. Update the secret:
   ```bash
   gh secret set TAURI_SIGNING_PRIVATE_KEY --repo sarveshsea/memi-studio < /tmp/new-updater.key
   ```
4. Wipe local: `rm /tmp/new-updater.key /tmp/new-updater.key.pub`
5. **CRITICAL:** Ship a new version (manual download required, since the old auto-update path is now dead). Include a release note explaining the migration.

## What's NOT a credential

These look like secrets but aren't:

- **Team ID** (`Z4ZUZ884U3`) — public, listed on every signed binary; no rotation
- **Public bundle identifier** (`cv.memoire.studio`) — public, embedded in the app
- **Updater public key** — public by design; embedded in `tauri.conf.json` and shipped with every build

## Verification commands

Quick sanity checks:

```bash
# Are all 9 secrets configured?
gh secret list --repo sarveshsea/memi-studio
# Expected: APPLE_APP_SPECIFIC_PASSWORD, APPLE_CERTIFICATE_BASE64,
#           APPLE_CERTIFICATE_PASSWORD, APPLE_ID, APPLE_SIGNING_IDENTITY,
#           APPLE_TEAM_ID, KEYCHAIN_PASSWORD,
#           TAURI_SIGNING_PRIVATE_KEY, TAURI_SIGNING_PRIVATE_KEY_PASSWORD

# When does the active cert expire?
security find-certificate -c "Developer ID Application: Humyn LLC." -a -p \
  | openssl x509 -noout -dates 2>/dev/null \
  | grep notAfter

# Latest release working?
gh release view --repo sarveshsea/memi-studio --json assets \
  | jq -r '.assets[].name'
# Expected: 2 .dmg files, 2 .app.tar.gz, 2 .app.tar.gz.sig, latest.json, SHA256SUMS

# Was a DMG actually notarized?
spctl -a -vv --type install <path-to-downloaded.dmg>
# Expected: accepted, source=Notarized Developer ID

# Local app/DMG build without updater signing
npm run tauri:build -- --target aarch64-apple-darwin

# Release build path that requires TAURI_SIGNING_PRIVATE_KEY
npm run tauri:build:release -- --target aarch64-apple-darwin
```
