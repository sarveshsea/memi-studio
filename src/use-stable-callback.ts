// SPDX-License-Identifier: FSL-1.1-ALv2
// Copyright 2026 Humyn LLC

import { useCallback, useLayoutEffect, useRef } from "react";

// Returns a referentially stable callback that always invokes the latest
// version of `fn`. This is the "useEvent" pattern: it lets us pass handlers to
// React.memo'd children without recreating them every render (so memo can skip
// re-renders) while avoiding stale closures - the ref is refreshed before paint,
// and the returned identity never changes.
//
// Only use this for event-style handlers invoked after render (onClick, onChange,
// async callbacks). Do not call the returned function during render.
export function useStableCallback<Args extends unknown[], Return>(
  fn: (...args: Args) => Return,
): (...args: Args) => Return {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: Args) => ref.current(...args), []);
}
