"use client";

import { useSyncExternalStore } from "react";

/**
 * Shared reduced-motion hook (brief: one hook, not reimplemented per component).
 * Returns true when the user prefers reduced motion; re-renders on change.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(cb: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}
