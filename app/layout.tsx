import { headers } from "next/headers";
import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";
import { TooltipLayer } from "@/components/TooltipLayer";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — what a web page knows about you`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "browser fingerprinting",
    "web privacy",
    "device fingerprint",
    "client hints",
    "supercookie",
    "cross-site tracking",
    "privacy demonstration",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME} — what a web page knows about you`,
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — what a web page knows about you`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  category: "technology",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en">
      <body>
        {/* Structured data: what this is, stated plainly. */}
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: SITE_NAME,
              url: SITE_URL,
              description: SITE_DESCRIPTION,
              inLanguage: "en",
              isAccessibleForFree: true,
              mainEntity: {
                "@type": "TechArticle",
                headline: "How each tracking technique works",
                url: `${SITE_URL}/methods`,
                description:
                  "Thirty-six browser tracking and fingerprinting techniques, how each works, what it exposes, and where browser defenses stand.",
              },
            }),
          }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50
                     focus:border focus:border-ink focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
        >
          Skip to content
        </a>
        {children}
        <TooltipLayer />
      </body>
    </html>
  );
}
