/** Canonical origin. Set NEXT_PUBLIC_SITE_URL in other environments. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sessioncontext.org"
).replace(/\/$/, "");

export const SITE_NAME = "Session Context";

export const SITE_DESCRIPTION =
  "Everything a single web page can work out about the browser, device and person that requested it — stated in plain English, with the raw values behind every claim.";

/** Public repository, shown in the header when set. */
export const REPO_URL =
  process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/oddurs/session-context";

/**
 * Origin used for the third-party embedding demonstration.
 *
 * It must be a different *registrable domain*, not a subdomain: browsers
 * partition storage by site, so an embed on a subdomain of this one would
 * count as first-party and demonstrate nothing. Locally the two loopback
 * hostnames serve that purpose.
 */
export const THIRD_PARTY_ORIGIN = process.env.NEXT_PUBLIC_THIRD_PARTY_ORIGIN ?? "";
