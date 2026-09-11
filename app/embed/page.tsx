import { EmbedClient } from "@/components/EmbedClient";

export const dynamic = "force-dynamic";

/**
 * Served on the *other* origin and embedded in the main page as an iframe, so
 * it runs in a genuine third-party context — the position every ad tracker
 * occupies. No outside company is involved: this is the same server reached
 * through its other hostname.
 */
export default function EmbedPage() {
  return <EmbedClient />;
}
