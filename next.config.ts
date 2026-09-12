import type { NextConfig } from "next";

/**
 * Client hints the server asks the browser to attach to subsequent requests.
 * Accept-CH only takes effect on trustworthy origins (localhost counts);
 * Critical-CH makes the browser immediately retry the first request with them.
 */
const CLIENT_HINTS = [
  "Sec-CH-UA",
  "Sec-CH-UA-Arch",
  "Sec-CH-UA-Bitness",
  "Sec-CH-UA-Full-Version",
  "Sec-CH-UA-Full-Version-List",
  "Sec-CH-UA-Mobile",
  "Sec-CH-UA-Model",
  "Sec-CH-UA-Platform",
  "Sec-CH-UA-Platform-Version",
  "Sec-CH-UA-WoW64",
  "Sec-CH-UA-Form-Factors",
  "Sec-CH-Prefers-Color-Scheme",
  "Sec-CH-Prefers-Reduced-Motion",
  "Sec-CH-Prefers-Reduced-Transparency",
  "Sec-CH-Prefers-Contrast",
  "Sec-CH-Forced-Colors",
  "Sec-CH-Viewport-Width",
  "Sec-CH-Viewport-Height",
  "Sec-CH-Width",
  "Sec-CH-DPR",
  "Device-Memory",
  "Downlink",
  "ECT",
  "RTT",
  "Save-Data",
];

const CRITICAL_HINTS = [
  "Sec-CH-UA-Arch",
  "Sec-CH-UA-Bitness",
  "Sec-CH-UA-Full-Version-List",
  "Sec-CH-UA-Model",
  "Sec-CH-UA-Platform-Version",
  "Sec-CH-Prefers-Color-Scheme",
  "Device-Memory",
];

/** Every permission-gated feature this page demonstrates, allowed for self. */
const PERMISSIONS_POLICY = [
  "accelerometer", "autoplay", "bluetooth", "camera",
  "clipboard-read", "clipboard-write", "compute-pressure", "display-capture",
  "fullscreen", "gamepad", "geolocation", "gyroscope", "hid", "idle-detection",
  "local-fonts", "magnetometer", "microphone", "midi", "payment", "picture-in-picture",
  "publickey-credentials-get", "screen-wake-lock", "serial", "storage-access",
  "usb", "window-management", "xr-spatial-tracking",
]
  .map((f) => `${f}=(self)`)
  .join(", ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        // Document routes only. The API routes set their own caching headers —
        // the ETag demonstration depends on responses being cacheable.
        source: "/:path(|embed)",
        headers: [
          { key: "Accept-CH", value: CLIENT_HINTS.join(", ") },
          { key: "Critical-CH", value: CRITICAL_HINTS.join(", ") },
          { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // The data page must never be cached: it is different per visitor.
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        // The methods page is static prose, so let crawlers and CDNs keep it.
        source: "/methods",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
