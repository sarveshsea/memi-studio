// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC
//
// Public surface of types/functions vendored from the Mémoire engine
// (github.com/sarveshsea/m-moire). Studio's React UI imports from here.
//
// MIGRATION PLAN: this directory will be replaced by `@sarveshsea/memi-studio-types`
// — a published npm package that re-exports the same names from the engine
// repo. When that lands, swap `from "./runtime/..."` to `from
// "@sarveshsea/memi-studio-types"` and delete this directory. The seam is
// here so the rewire is mechanical.

export * from "./manager-types.js";
export * from "./view-model.js";
export * from "./reference-trace.js";
export * from "./design-system-artifact-types.js";
