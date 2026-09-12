/**
 * In-memory server-side records for the tracking demonstrations.
 *
 * Deliberately process-local and never persisted: restarting the server
 * forgets everyone. Both stores are bounded, because a public instance would
 * otherwise accumulate an entry per visitor until the process ran out of
 * memory.
 */
type EtagRecord = { firstSeen: number; lastSeen: number; hits: number };
type CssRecord = { firstSeen: number; lastSeen: number; features: Record<string, number> };

const MAX_ENTRIES = 5_000;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const g = globalThis as unknown as {
  __dmEtag?: Map<string, EtagRecord>;
  __dmCss?: Map<string, CssRecord>;
};

export const etagStore: Map<string, EtagRecord> = (g.__dmEtag ??= new Map());
export const cssStore: Map<string, CssRecord> = (g.__dmCss ??= new Map());

/**
 * Drop anything stale, then the oldest entries if still over the cap. Map
 * preserves insertion order, so the first keys are the least recently added.
 */
function prune<T extends { lastSeen: number }>(store: Map<string, T>) {
  const cutoff = Date.now() - MAX_AGE_MS;
  for (const [key, value] of store) {
    if (value.lastSeen < cutoff) store.delete(key);
  }
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

export function rememberEtag(id: string, record: EtagRecord) {
  etagStore.set(id, record);
  prune(etagStore);
}

export function recordCssHit(key: string, feature: string) {
  const rec = cssStore.get(key) ?? {
    firstSeen: Date.now(),
    lastSeen: Date.now(),
    features: {},
  };
  // Re-insert so the key counts as recently used for pruning.
  cssStore.delete(key);
  rec.features[feature] = (rec.features[feature] ?? 0) + 1;
  rec.lastSeen = Date.now();
  cssStore.set(key, rec);
  prune(cssStore);
}
