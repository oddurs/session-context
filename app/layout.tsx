import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Session Context",
  description:
    "Every piece of context observable about this browser session, laid out in tables.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
