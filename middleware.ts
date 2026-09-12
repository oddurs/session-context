import { NextResponse, type NextRequest } from "next/server";

/**
 * Content Security Policy, per request.
 *
 * The page needs a few things an ordinary site does not: a blob-backed Web
 * Worker for the cross-check, an inline stylesheet for the CSS-only probes,
 * and an inline JSON-LD block. Rather than opening the policy with
 * 'unsafe-inline', each request carries a nonce that those three use.
 */
export function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, "");

  // The third-party demonstration frames a second registrable domain, and is
  // framed by it in turn, so both directions have to be allowed explicitly.
  // Locally that second origin is the other loopback hostname.
  const host = request.headers.get("host") ?? "";
  const sibling = host.startsWith("localhost")
    ? `http://${host.replace("localhost", "127.0.0.1")}`
    : host.startsWith("127.0.0.1")
      ? `http://${host.replace("127.0.0.1", "localhost")}`
      : "";

  // Both origins serve this same app, so each has to allow the other in both
  // directions: the parent frames the embed, and the embed is framed by the
  // parent. Naming only one of them blocks the demonstration from inside.
  const frameOrigins = [
    "'self'",
    process.env.NEXT_PUBLIC_THIRD_PARTY_ORIGIN ?? "",
    process.env.NEXT_PUBLIC_SITE_URL ?? "",
    sibling,
  ]
    .filter(Boolean)
    .join(" ");

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    // React sets width and position through style attributes.
    `style-src-attr 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `media-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    // The worker cross-check runs from a blob URL.
    `worker-src 'self' blob:`,
    `frame-src ${frameOrigins}`,
    `frame-ancestors ${frameOrigins}`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Documents only: static assets and the probe pixel carry no markup.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|api/css).*)",
  ],
};
