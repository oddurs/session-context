"use client";

import { useSyncExternalStore } from "react";

/**
 * Lazy access to the tooltip prose.
 *
 * The definitions are a quarter of the page's JavaScript and matter only when
 * someone hovers a field name, so the module is fetched once the browser is
 * idle. Until it lands, tables render without tooltips rather than waiting.
 */
type Lookup = (field: string, sectionId?: string) => string | undefined;

let lookup: Lookup | null = null;
let loading: Promise<void> | null = null;
const subscribers = new Set<() => void>();

export function loadNotes(): Promise<void> {
  if (lookup) return Promise.resolve();
  loading ??= import("./notes-bundle").then((m) => {
    lookup = m.lookupTerm;
    for (const notify of subscribers) notify();
  });
  return loading;
}

/** Kick the load off as soon as the browser has a spare moment. */
export function scheduleNotesLoad() {
  if (typeof window === "undefined") return;
  const idle = (window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
  }).requestIdleCallback;
  if (idle) idle(() => void loadNotes(), { timeout: 3000 });
  else setTimeout(() => void loadNotes(), 1200);
}

function subscribe(onChange: () => void) {
  subscribers.add(onChange);
  return () => subscribers.delete(onChange);
}

/** The resolver, or null until the module has loaded. */
export function useFieldNotes(): Lookup | null {
  return useSyncExternalStore(
    subscribe,
    () => lookup,
    () => null
  );
}
