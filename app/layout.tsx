import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Session Context",
  description:
    "Everything a single web page can work out about the browser, device and person that requested it — stated in plain English, with the raw values behind every claim.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50
                     focus:border focus:border-ink focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
