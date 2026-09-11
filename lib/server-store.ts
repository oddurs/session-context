/**
 * In-memory server-side records for the tracking demonstrations. Deliberately
 * process-local and never persisted: restarting the server forgets everyone.
 */
type EtagRecord = { firstSeen: number; lastSeen: number; hits: number };
type CssRecord = { firstSeen: number; lastSeen: number; features: Record<string, number> };

const g = globalThis as unknown as {
  __dmEtag?: Map<string, EtagRecord>;
  __dmCss?: Map<string, CssRecord>;
};

export const etagStore: Map<string, EtagRecord> = (g.__dmEtag ??= new Map());
export const cssStore: Map<string, CssRecord> = (g.__dmCss ??= new Map());

export function recordCssHit(key: string, feature: string) {
  const rec = cssStore.get(key) ?? {
    firstSeen: Date.now(),
    lastSeen: Date.now(),
    features: {},
  };
  rec.features[feature] = (rec.features[feature] ?? 0) + 1;
  rec.lastSeen = Date.now();
  cssStore.set(key, rec);
}
