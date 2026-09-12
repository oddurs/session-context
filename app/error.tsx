"use client";

import { useEffect } from "react";

/**
 * A render failure should not leave a blank page. The collection code touches
 * dozens of platform APIs, and an unexpected shape from any of them could
 * throw during render on a browser nobody tested.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Session Context failed to render:", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <h1 className="text-xl font-semibold tracking-tight">This page failed to render.</h1>
      <p className="mt-3 max-w-[70ch] text-base leading-relaxed text-ink-muted">
        Something in the collection threw an error your browser did not expect.
        Nothing was sent anywhere, and nothing about the failure left this
        machine.
      </p>
      <p className="mt-3 max-w-[70ch] font-mono text-sm text-ink-muted">
        {error.message}
        {error.digest && ` (${error.digest})`}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 border border-rule-strong px-2.5 py-1 text-sm hover:bg-sunken"
      >
        Try again
      </button>
    </main>
  );
}
