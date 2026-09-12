import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME} — what a web page knows about you`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Monochrome and typographic, like the page it represents. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fcfcfa",
          color: "#16160f",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: "-0.01em" }}>
          {SITE_NAME}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 76,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            maxWidth: 960,
          }}
        >
          Everything a web page can work out about you, in plain English.
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "2px solid #16160f",
            paddingTop: 24,
            fontSize: 26,
            color: "#605e54",
          }}
        >
          <span>800 fields · 40 tables · no permission asked</span>
          <span>sessioncontext.org</span>
        </div>
      </div>
    ),
    size
  );
}
