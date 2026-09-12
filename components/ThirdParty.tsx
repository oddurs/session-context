"use client";

import { useEffect, useRef } from "react";
import { useClientValue } from "@/lib/use-client-value";
import type { Section } from "@/lib/types";
import { Card } from "./ui";

/**
 * A real third-party context without involving a third party: the same server
 * is reachable on two hostnames (127.0.0.1 and localhost), which the browser
 * treats as entirely separate origins. Embedding one inside the other puts a
 * frame in exactly the position an ad tracker occupies.
 */
function otherOrigin(): string | null {
  if (typeof location === "undefined") return null;
  const { protocol, hostname, port } = location;
  const swap =
    hostname === "127.0.0.1" ? "localhost" : hostname === "localhost" ? "127.0.0.1" : null;
  return swap ? `${protocol}//${swap}${port ? `:${port}` : ""}` : null;
}

export function ThirdParty({ onResult }: { onResult: (s: Section) => void }) {
  // Resolved on the client only: the server has no `location`, and branching on
  // it during render would desynchronise hydration.
  const origin = useClientValue<string | null | undefined>(otherOrigin, undefined);
  const reported = useRef(false);

  useEffect(() => {
    if (origin === undefined) return;
    if (!origin) {
      onResult({
        id: "third-party",
        title: "Third-Party Embedding",
        note: "This demonstration needs the site to be reachable on two hostnames so one can be embedded in the other as a genuine cross-origin frame.",
        rows: [
          { k: "status", v: `not available on host "${location.hostname}"`, n: "open the site on 127.0.0.1 or localhost" },
        ],
      });
      return;
    }
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== "dm-thirdparty" || reported.current) return;
      reported.current = true;
      const r = e.data.report;
      onResult({
        id: "third-party",
        title: "Third-Party Embedding",
        note:
          "The frame below is served from a different origin and runs as a true third party, exactly as an advertising tag does. It sets and reads its own identifier from inside this page. Modern browsers partition that storage per embedding site, so the copy it holds here is separate from the one it holds when visited directly — that separation is the protection, and you can see whether your browser applies it.",
        rows: [
          { k: "this page's origin", v: location.origin },
          { k: "embedded frame's origin", v: r.origin, n: "a different site, by the browser's rules" },
          { k: "frame is cross-origin", v: r.origin !== location.origin },
          { k: "identifier the frame holds", v: r.id },
          { k: "frame recognised this browser", v: !r.isNew, n: "false means its storage was partitioned or blocked" },
          { k: "third-party cookie written", v: r.cookieWritten, n: "blocked by default in many browsers" },
          { k: "third-party cookie read back", v: r.cookieRead ?? "none" },
          { k: "third-party localStorage written", v: r.storageWritten },
          { k: "third-party localStorage read back", v: r.storageRead ?? "none" },
          { k: "hasStorageAccess()", v: r.hasStorageAccess },
          { k: "storage partitioning", v: r.partitioned },
          { k: "referrer passed to the frame", v: r.referrer, n: "tells the tracker which page you are on" },
          { k: "frame errors", v: r.error ?? "none" },
        ],
      });
    };
    addEventListener("message", onMessage);
    return () => removeEventListener("message", onMessage);
  }, [origin, onResult]);

  if (origin === undefined)
    return (
      <Card tone="raised" className="mt-3 mb-10 p-3 text-sm text-ink-faint">
        Preparing the third-party frame…
      </Card>
    );
  if (!origin) return null;
  return (
    <Card tone="raised" className="mt-3 mb-10 overflow-hidden">
      <div className="border-b border-rule px-3 py-1.5 text-xs text-ink-muted">
        Live third-party frame · {origin}
      </div>
      <iframe
        src={`${origin}/embed`}
        title="Third-party context"
        className="h-9 w-full border-0 bg-surface"
      />
    </Card>
  );
}
