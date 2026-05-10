# Licensing Plan — ready when you decide to charge

> Mémoire Studio currently ships **free, no license check**. This doc captures the implementation plan for a one-time-purchase, Mac-bound license model so flipping the switch is a contained PR rather than a from-scratch design exercise.

## Decisions assumed

| Decision | Choice | Why |
|---|---|---|
| Pricing model | $9 one-time, lifetime | Matches the launch copy; no subscription churn |
| License binding | One Mac per license | "Bound to the Mac you activate on" |
| Transfer policy | Manual via X message → Lemon Squeezy dashboard deactivate | Personal-touch UX, low friction at low scale |
| Trial | 2 days, full features, then paywall | Already in launch copy; can be tuned later |
| Payment provider | **Lemon Squeezy** | Merchant-of-record (handles VAT/tax), built-in license-key API, hosted checkout, ~5% + 50¢ |
| Mac fingerprint | `IOPlatformUUID` via `system_profiler SPHardwareDataType` | Stable across reinstalls; only changes on motherboard repair |
| License storage | macOS Keychain via `tauri-plugin-keyring` | Encrypted; survives reinstalls; can't be moved by copying the app bundle |
| Network model | First-activation requires network; offline thereafter | Anti-user to require constant connectivity |

## Architecture

```
[App launch]
   │
   ▼
[Keychain: license activation token?]
  yes → allow full use
   no →
       [Keychain: trial start timestamp?]
         missing → store now, allow full use
         <48h ago → allow full use
         ≥48h → show paywall:
                  [Buy License] → Lemon Squeezy hosted checkout ($9, one-time)
                  [Enter Key]   → activation modal:
                                    POST api.lemonsqueezy.com/v1/licenses/activate
                                      body: license_key, instance_name=<IOPlatformUUID>
                                    on success → store activation token in Keychain
                                    on failure → show readable error
```

## Files to add (estimated total: ~400 LOC)

### Engine side (memi-studio)

| File | Purpose | Approx LOC |
|---|---|---|
| `src-tauri/src/license.rs` | Mac UUID via IOKit + Lemon Squeezy `activate` HTTP call wrapper. Exposes Tauri commands `get_machine_uuid`, `activate_license`, `validate_license` | 80 |
| `src/lib/license.ts` | TS-side bridge: read/write Keychain via `tauri-plugin-keyring`, drive activation flow, surface license state to the UI | 100 |
| `src/components/PaywallSheet.tsx` | Modal shown when trial expires. Two paths: "Buy License" (opens checkout in browser) + "Enter Key" (text input + activation call) | 90 |
| `src/components/LicenseGate.tsx` | Wraps `<App>` and decides what to render based on license state (loading → paywall → app) | 60 |
| `src/license-state.ts` | useLicenseGate hook + state machine for trial/active/expired transitions | 70 |

### Workflow

- Add `tauri-plugin-keyring = "2"` to `src-tauri/Cargo.toml`
- Add `tauri-plugin-keyring-api` to `package.json`
- Update `src-tauri/capabilities/default.json`: `"keyring:default"`

## Lemon Squeezy setup (one-time, in their dashboard)

1. Sign up + create a store
2. Create a product "Mémoire Studio" — **One-time purchase**, $9
3. Toggle **License keys** on
4. Set **Max activations per key** = 1
5. Configure store branding + tax (Lemon Squeezy auto-handles VAT)
6. Copy the hosted-checkout URL → that's the "Buy License" button's `href`
7. (Optional) Configure a webhook → your Cloudflare Worker if you want sale tracking

Two new repo Secrets to add for the validate endpoint (optional — not needed for launch):
- `LEMON_SQUEEZY_API_KEY` — for server-side license lookup if you build a reset endpoint
- `LEMON_SQUEEZY_STORE_ID` — for filtering API calls

## Reset / transfer flow (manual, matches the X-message UX)

When a user messages on X:
1. Lemon Squeezy dashboard → Licenses → search by email
2. Click the license key → "Deactivate instance" on the old Mac's instance
3. User runs the activation flow again on their new Mac with the same key

Future iteration: an in-app "I got a new Mac" button that opens Lemon Squeezy's customer portal so the user self-serves.

## What this plan deliberately doesn't include

- **Code obfuscation / anti-debugging** — at $9, the time spent hardening costs more than piracy ever will
- **Periodic mandatory online checks** — anti-user; offline-after-activation is the right model
- **Per-feature gating** — gate the whole app, not slices of it
- **Receipt validation server** — Lemon Squeezy's native API is already the validation server
- **Subscription / upgrade fees** — your launch copy explicitly promises lifetime + free updates

## Threat model

At $9, the realistic threats are:
- **Casual sharing** (friend → friend) → prevented by Mac binding + per-key activation cap of 1
- **Determined cracker** → can be defeated; not worth fighting at this price point
- **Refund abuse** (buy → activate → refund → keep using) → mitigated by Lemon Squeezy's chargeback flow which deactivates the license on refund (you ship a 30-day re-validation in a follow-up to enforce this)

You'll get 90%+ honest payment with the basic system above. Don't gold-plate.

## Implementation timeline

When you decide to ship licensing:

| Phase | Time | What lands |
|---|---|---|
| 1 — Backend seam | 1 hr | Add Cargo.toml deps, capabilities, Tauri commands + IOKit UUID + Lemon Squeezy HTTP wrapper. PR + merge. |
| 2 — UI surface | 2 hr | PaywallSheet, LicenseGate, useLicenseGate hook, plumbing into App.tsx. PR + merge. |
| 3 — Lemon Squeezy live | 30 min | Sign up, create product, copy checkout URL into a new env-derived const. PR + merge. |
| 4 — Tag v0.19.0 with paywall | 30 min | Bump version, tag, watch release.yml. Existing auto-updater carries v0.18.0 users to v0.19.0 → first launch on v0.19.0 sees the paywall. |

Total: half a day of focused work to ship the paid tier.

## Status

**Not started.** This doc is the spec; implementation lands when you give the word.
