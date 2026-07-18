# iOS and SwiftUI workflow

Mémoire Studio 2.5 routes Apple-platform tasks through the Memi 2.6 runtime instead of treating SwiftUI as a generic frontend request.

## Start in Studio

- Choose **Build SwiftUI** or enter `/ios` in the composer.
- Studio uses guarded Build mode and sends the Apple workflow contract to the selected Codex or Claude harness.
- The agent begins with `memi ios brief --detail compact --json`, inspects the real Xcode project, and previews any generated file plan before writing.

## Evidence contract

Memi may create a spec, SwiftUI view, preview, model, and Swift Testing file. It never mutates an Xcode project or workspace silently. The agent must use the repository's existing project integration path and report which of these stages actually passed:

1. source generation
2. project integration
3. shared-scheme build
4. unit or UI tests
5. preview rendering
6. simulator flow
7. performance profiling
8. signing, archive, or App Store validation

Liquid Glass is an iOS 26+ enhancement with a native fallback. Studio and Memi do not claim iOS 27 support without a released SDK, implementation, and test evidence.

## Local release proof

`scripts/studio-ios-runtime-smoke.mjs` invokes the packaged sidecar, checks dry-run and approved writes in a temporary project, and typechecks the generated SwiftUI source against the installed iOS Simulator SDK. It is part of `npm run test:live-e2e`.
