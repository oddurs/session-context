/**
 * Published entropy estimates for the signals this page collects.
 *
 * This site deliberately keeps no database of visitors, so it cannot tell you
 * how rare *you* are — that requires a population to compare against, and
 * keeping one would make this page the thing it is arguing about. What it can
 * do is show what researchers measured when they did keep such a population.
 *
 * Values are normalized Shannon entropy from the AmIUnique study of 118,934
 * browsers (Laperdrix, Rudametkin and Baudry, IEEE S&P 2016), converted to
 * bits against that sample's maximum of log2(118,934) ≈ 16.86 bits. A few
 * comparisons come from Panopticlick (Eckersley, PETS 2010, 470,161 browsers).
 */
export const SAMPLE_BITS = Math.log2(118_934);

export type EntropyEstimate = {
  /** the signal, named as this page names it */
  signal: string;
  /** normalized Shannon entropy in the study's sample, 0 to 1 */
  normalized: number;
  /** section on this page where the signal is collected */
  section: string;
  /** whether the estimate still holds, and why it might not */
  standing: "holds" | "decayed" | "grown";
  note: string;
};

export const ESTIMATES: EntropyEstimate[] = [
  {
    signal: "List of plugins",
    normalized: 0.656,
    section: "navigator",
    standing: "decayed",
    note: "The strongest desktop signal in 2016, and almost worthless now: browsers froze the plugin list to a fixed set precisely because of results like this one.",
  },
  {
    signal: "User agent",
    normalized: 0.58,
    section: "navigator",
    standing: "decayed",
    note: "Still substantial, but reduced since: Chrome and Safari now freeze most of the string. The version detail moved to client hints, where a server has to ask for it.",
  },
  {
    signal: "List of fonts",
    normalized: 0.497,
    section: "fonts",
    standing: "decayed",
    note: "Measured through Flash in the original study. Width-measurement detection, which this page uses, sees fewer fonts — but the permission-gated API sees them all.",
  },
  {
    signal: "Canvas rendering",
    normalized: 0.491,
    section: "fingerprints",
    standing: "holds",
    note: "Among the highest-entropy signals then and now. Firefox and Safari have since added randomization; Chrome has not.",
  },
  {
    signal: "Content language",
    normalized: 0.351,
    section: "server-derived",
    standing: "holds",
    note: "Your ranked language list. Unchanged since the study, and sent on every request whether or not the page runs any script.",
  },
  {
    signal: "Screen resolution",
    normalized: 0.29,
    section: "screen",
    standing: "holds",
    note: "Display geometry, including color depth. Unchanged, and now joined by device pixel ratio and refresh rate.",
  },
  {
    signal: "List of HTTP headers",
    normalized: 0.249,
    section: "request-headers",
    standing: "grown",
    note: "Which headers you send, in which order. Client hints have added more of them since 2016, not fewer.",
  },
  {
    signal: "Timezone",
    normalized: 0.198,
    section: "locale",
    standing: "holds",
    note: "Unchanged, ungated, and enough on its own to place you in a region.",
  },
  {
    signal: "Platform",
    normalized: 0.137,
    section: "navigator",
    standing: "decayed",
    note: "Now frozen alongside the user agent in most browsers.",
  },
  {
    signal: "Content encoding",
    normalized: 0.091,
    section: "request-headers",
    standing: "grown",
    note: "Which compression formats you accept. Support for newer ones, such as zstd, dates the browser.",
  },
  {
    signal: "Accept header",
    normalized: 0.082,
    section: "request-headers",
    standing: "holds",
    note: "The content types you will take, with their quality values.",
  },
  {
    signal: "Do Not Track",
    normalized: 0.056,
    section: "privacy",
    standing: "decayed",
    note: "Worth little then, and less now that browsers have removed it. Turning it on made you marginally rarer, which was always its problem.",
  },
  {
    signal: "Local storage available",
    normalized: 0.024,
    section: "storage",
    standing: "holds",
    note: "Nearly everyone has it. Its value is in what it stores, not in its presence.",
  },
  {
    signal: "Cookies enabled",
    normalized: 0.016,
    section: "privacy",
    standing: "holds",
    note: "The least informative thing on this list: almost nobody turns cookies off.",
  },
];

export const bitsOf = (e: EntropyEstimate) => e.normalized * SAMPLE_BITS;

/**
 * The naive sum, which is an upper bound rather than a total: the signals
 * correlate heavily, so real combined entropy is lower.
 */
export const NAIVE_TOTAL_BITS = ESTIMATES.reduce((n, e) => n + bitsOf(e), 0);

export const SOURCES = [
  {
    label: "Laperdrix, Rudametkin, Baudry — “Beauty and the Beast”, IEEE S&P 2016",
    detail: "118,934 browsers via amiunique.org; normalized Shannon entropy per attribute.",
    href: "https://amiunique.org/",
  },
  {
    label: "Eckersley — “How Unique Is Your Web Browser?”, PETS 2010",
    detail: "470,161 browsers via Panopticlick; the study that established the method.",
    href: "https://coveryourtracks.eff.org/",
  },
];
