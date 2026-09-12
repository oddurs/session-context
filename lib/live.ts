import type { Section } from "./types";

/**
 * What changes while you sit on the page.
 *
 * Cheap property reads are re-taken on a timer; everything else is recomputed
 * when the browser says it changed — resizing a window, toggling dark mode,
 * plugging in a headset, granting a permission, unplugging the charger.
 */
export type LiveKind = "cheap" | "network" | "devices" | "permissions" | "hardware";

/** Sections that keep updating after collection, marked as such in the UI. */
export const LIVE_SECTIONS = new Set([
  "screen",
  "preferences",
  "document",
  "locale",
  "interaction",
  "network",
  "devices",
  "permissions",
  "hardware",
]);

const MEDIA_QUERIES = [
  "(prefers-color-scheme: dark)",
  "(prefers-reduced-motion: reduce)",
  "(prefers-contrast: more)",
  "(forced-colors: active)",
  "(inverted-colors: inverted)",
  "(orientation: portrait)",
  "(display-mode: standalone)",
  "(pointer: coarse)",
  "(hover: none)",
  "(min-resolution: 2dppx)",
  "(dynamic-range: high)",
];

const PERMISSION_NAMES = [
  "geolocation", "notifications", "camera", "microphone", "clipboard-read",
  "persistent-storage", "local-fonts", "window-management", "idle-detection",
];

/**
 * Subscribe to everything that can change. Returns a teardown function.
 */
export function watchLive(notify: (kind: LiveKind) => void): () => void {
  const cleanups: (() => void)[] = [];
  const on = (
    target: EventTarget | null | undefined,
    event: string,
    kind: LiveKind
  ) => {
    if (!target) return;
    const handler = () => notify(kind);
    target.addEventListener(event, handler);
    cleanups.push(() => target.removeEventListener(event, handler));
  };

  // Window geometry, focus and page state
  for (const event of ["resize", "orientationchange", "focus", "blur", "fullscreenchange"])
    on(window, event, "cheap");
  on(document, "visibilitychange", "cheap");
  on(window.visualViewport, "resize", "cheap");
  on(window.visualViewport, "scroll", "cheap");

  // Operating-system preferences
  for (const query of MEDIA_QUERIES) {
    try {
      on(matchMedia(query), "change", "cheap");
    } catch {
      /* unsupported query */
    }
  }

  // Connectivity
  on(window, "online", "network");
  on(window, "offline", "network");
  on((navigator as unknown as { connection?: EventTarget }).connection, "change", "network");

  // Hardware coming and going
  on(navigator.mediaDevices, "devicechange", "devices");
  on(window, "gamepadconnected", "hardware");
  on(window, "gamepaddisconnected", "hardware");

  const battery = (navigator as unknown as {
    getBattery?: () => Promise<EventTarget>;
  }).getBattery;
  if (battery) {
    void battery.call(navigator).then((b) => {
      for (const event of ["levelchange", "chargingchange", "dischargingtimechange"])
        on(b, event, "hardware");
    }).catch(() => {});
  }

  // Permissions granted or revoked elsewhere in the browser
  const permissions = (navigator as unknown as {
    permissions?: { query: (d: { name: string }) => Promise<EventTarget> };
  }).permissions;
  if (permissions) {
    for (const name of PERMISSION_NAMES) {
      permissions
        .query({ name })
        .then((status) => on(status, "change", "permissions"))
        .catch(() => {});
    }
  }

  return () => cleanups.forEach((fn) => fn());
}

/** Replace any section that has a newer version, keeping order. */
export function applyLive(sections: Section[], updates: Section[]): Section[] {
  if (!updates.length) return sections;
  const byId = new Map(updates.map((s) => [s.id, s]));
  return sections.map((s) => {
    const next = byId.get(s.id);
    return next ? { ...next, group: s.group, subgroup: s.subgroup } : s;
  });
}
