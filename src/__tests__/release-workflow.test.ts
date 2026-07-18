// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { describe, expect, it } from "vitest";
import workflow from "../../.github/workflows/release.yml?raw";

describe("Studio release workflow", () => {
  it("normalizes DMG names before generating checksums", () => {
    expect(workflow).toContain('VERSION="${TAG#v}"');
    expect(workflow).toContain('Memoire.Studio_${VERSION}_aarch64.dmg');
    expect(workflow).toContain('Memoire.Studio_${VERSION}_x64.dmg');
    expect(workflow).toContain("shasum -a 256 Memoire.Studio_*.dmg > SHA256SUMS");
  });
});
