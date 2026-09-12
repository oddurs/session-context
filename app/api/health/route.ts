import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Liveness, and which build is answering.
 *
 * Railway holds a deployment back when this does not return 200, so a
 * container that builds but cannot serve never takes traffic. The commit is
 * here so the smoke test after a deploy can tell the new build from the old
 * one it is replacing, rather than passing against whatever is still running.
 *
 * Nothing about the visitor is read or recorded: this is the one route on the
 * site that is the same for everyone.
 */
export function GET() {
  return NextResponse.json(
    {
      ok: true,
      commit: process.env.RAILWAY_GIT_COMMIT_SHA ?? null,
      startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
