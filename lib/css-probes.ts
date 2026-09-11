/**
 * Fingerprinting with no JavaScript at all.
 *
 * Each probe is a CSS rule that, when it matches, causes the browser to fetch
 * one distinct image URL. The server sees which URLs were requested and
 * therefore which conditions were true — with scripts disabled, blocked, or
 * never loaded in the first place.
 */
export type CssProbe = { id: string; label: string; rule: string };

export const CSS_PROBES: CssProbe[] = [
  // What the operating system told the browser
  { id: "dark", label: "Dark mode is on", rule: "@media (prefers-color-scheme: dark)" },
  { id: "light", label: "Light mode is on", rule: "@media (prefers-color-scheme: light)" },
  { id: "reduced-motion", label: "Reduced motion requested", rule: "@media (prefers-reduced-motion: reduce)" },
  { id: "reduced-transparency", label: "Reduced transparency requested", rule: "@media (prefers-reduced-transparency: reduce)" },
  { id: "more-contrast", label: "Higher contrast requested", rule: "@media (prefers-contrast: more)" },
  { id: "less-contrast", label: "Lower contrast requested", rule: "@media (prefers-contrast: less)" },
  { id: "forced-colors", label: "Forced colours active (high-contrast mode)", rule: "@media (forced-colors: active)" },
  { id: "inverted", label: "Colours inverted", rule: "@media (inverted-colors: inverted)" },
  { id: "reduced-data", label: "Data saving requested", rule: "@media (prefers-reduced-data: reduce)" },

  // The display
  { id: "gamut-p3", label: "Wide colour display (P3)", rule: "@media (color-gamut: p3)" },
  { id: "gamut-rec2020", label: "Very wide colour display (Rec. 2020)", rule: "@media (color-gamut: rec2020)" },
  { id: "hdr", label: "HDR-capable display", rule: "@media (dynamic-range: high)" },
  { id: "monochrome", label: "Monochrome display", rule: "@media (monochrome)" },
  { id: "dpr1", label: "Standard-density screen (1×)", rule: "@media (resolution: 1dppx)" },
  { id: "dpr2", label: "Retina screen (2×)", rule: "@media (resolution: 2dppx)" },
  { id: "dpr3", label: "High-density screen (3×)", rule: "@media (resolution: 3dppx)" },
  { id: "portrait", label: "Portrait orientation", rule: "@media (orientation: portrait)" },
  { id: "landscape", label: "Landscape orientation", rule: "@media (orientation: landscape)" },

  // Window size buckets
  { id: "w-xs", label: "Window narrower than 640px", rule: "@media (max-width: 639px)" },
  { id: "w-sm", label: "Window 640–1023px", rule: "@media (min-width: 640px) and (max-width: 1023px)" },
  { id: "w-md", label: "Window 1024–1439px", rule: "@media (min-width: 1024px) and (max-width: 1439px)" },
  { id: "w-lg", label: "Window 1440–1919px", rule: "@media (min-width: 1440px) and (max-width: 1919px)" },
  { id: "w-xl", label: "Window 1920px or wider", rule: "@media (min-width: 1920px)" },
  { id: "h-sm", label: "Window shorter than 800px", rule: "@media (max-height: 799px)" },
  { id: "h-lg", label: "Window 800px tall or more", rule: "@media (min-height: 800px)" },

  // Input and display mode
  { id: "pointer-fine", label: "Mouse or trackpad", rule: "@media (pointer: fine)" },
  { id: "pointer-coarse", label: "Touchscreen", rule: "@media (pointer: coarse)" },
  { id: "hover", label: "Can hover", rule: "@media (hover: hover)" },
  { id: "no-hover", label: "Cannot hover", rule: "@media (hover: none)" },
  { id: "standalone", label: "Installed as an app", rule: "@media (display-mode: standalone)" },
  { id: "update-fast", label: "Fast-updating display", rule: "@media (update: fast)" },

  // The one that proves the point
  { id: "scripting-none", label: "JavaScript is DISABLED", rule: "@media (scripting: none)" },
  { id: "scripting-enabled", label: "JavaScript is enabled", rule: "@media (scripting: enabled)" },

  // Engine tells: which browser, from CSS support alone
  { id: "sup-oklch", label: "Supports oklch() colours", rule: "@supports (color: oklch(0.5 0.1 200))" },
  { id: "sup-has", label: "Supports :has()", rule: "@supports selector(:has(a))" },
  { id: "sup-nesting", label: "Supports CSS nesting", rule: "@supports selector(&)" },
  { id: "sup-backdrop", label: "Supports backdrop-filter", rule: "@supports (backdrop-filter: blur(1px))" },
  { id: "sup-container", label: "Supports container queries", rule: "@supports (container-type: inline-size)" },
  { id: "sup-webkit-touch", label: "WebKit on touch (iOS Safari)", rule: "@supports (-webkit-touch-callout: none)" },
  { id: "sup-moz", label: "Gecko engine (Firefox)", rule: "@supports (-moz-appearance: none)" },
  { id: "sup-apple-pay", label: "Apple Pay button style (Safari)", rule: "@supports (-webkit-appearance: -apple-pay-button)" },
  { id: "sup-font-smoothing", label: "WebKit/Blink font smoothing", rule: "@supports (-webkit-font-smoothing: antialiased)" },
];

/** The stylesheet that does the work. One rule and one element per probe. */
export function buildProbeCss(key: string): string {
  const enc = encodeURIComponent(key);
  return CSS_PROBES.map(
    (p) =>
      `${p.rule}{#cssp-${p.id}{background-image:url("/api/css?s=${enc}&f=${p.id}")}}`
  ).join("");
}
