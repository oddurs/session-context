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

  // The dev server is a different application from the built one. Turbopack
  // evaluates modules with `eval`, injects its own unnonced stylesheets, and
  // loads chunks in a way Firefox does not accept under 'strict-dynamic' —
  // there the app never hydrates at all and the page sits on its loading state
  // forever, with no error to explain it. Chrome's dev path happens not to hit
  // any of it, which is what made this look like a Firefox bug.
  //
  // So development gets the ordinary Next dev policy and production keeps the
  // strict one. The policy shipped to real visitors is the `dev === false`
  // branch, and that is the one worth reading.
  const dev = process.env.NODE_ENV !== "production";

  // Railway terminates TLS and forwards the original scheme; locally there is
  // no such header and the request is plain http.
  const secure =
    request.headers.get("x-forwarded-proto") === "https" ||
    request.nextUrl.protocol === "https:";

  const csp = [
    `default-src 'self'`,
    dev
      ? `script-src 'self' 'unsafe-inline' 'unsafe-eval'`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // A nonce makes the browser ignore 'unsafe-inline', so dev drops the nonce
    // rather than listing both and getting neither.
    dev ? `style-src 'self' 'unsafe-inline'` : `style-src 'self' 'nonce-${nonce}'`,
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
    // Only meaningful once the site is actually served over TLS, and actively
    // harmful before then: on a plain http:// origin it upgrades the page's
    // own subresources to https, where nothing is listening. Chrome exempts
    // loopback and Safari and Firefox do not, so `npm start` on localhost
    // loaded the markup and then never hydrated in either of them. Keyed on
    // the protocol rather than on NODE_ENV, because the production build run
    // locally has the same problem as the dev server did.
    secure ? `upgrade-insecure-requests` : "",
  ]
    .filter(Boolean)
    .join("; ");

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
