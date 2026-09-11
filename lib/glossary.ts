/**
 * Plain-English definitions for the jargon that appears in field names.
 * Matched against a row's field name, longest pattern first, so a row like
 * "WebGL 1 · UNMASKED_RENDERER" picks up the WebGL explanation.
 */
export const GLOSSARY: [RegExp, string][] = [
  [/user.?agent|^ua\b|userAgent/i, "A line of text your browser announces itself with on every request — its name, version and operating system. It is freely editable, which is why sites cross-check it against everything else."],
  [/client hint|sec-ch-/i, "A newer, structured replacement for the user-agent line. The server asks for specific details (processor type, exact version, screen width) and the browser then attaches them to every following request automatically."],
  [/canvas/i, "A drawing surface web pages use for graphics. Because your graphics card, drivers and fonts all affect the exact pixels produced, the same drawing comes out subtly different on different machines — which makes it an identifier."],
  [/webgl|webgpu|unmasked|renderer|gpu/i, "The interface that lets web pages use your graphics chip. It hands over the chip's full model name and capabilities without asking permission."],
  [/fingerprint|visitorid|hash|digest/i, "A short code summarising many small details about your device. Feed the same device in and you get the same code out, which lets a site recognise you without storing anything on your machine."],
  [/entropy|confidence/i, "A measure of how much a detail narrows you down. A detail that splits the world in half is worth little; one that only a thousand people share is worth a lot."],
  [/indexeddb|localstorage|sessionstorage|cachestorage|cookiestore|storage\.|quota|usage/i, "Places a website can save data inside your browser. They are separate systems, so clearing one does not clear the others — which is how a deleted identifier can come back."],
  [/cookie/i, "A small piece of text a site stores in your browser and gets back on every later visit. The original tracking mechanism, and now the least of the problem."],
  [/samesite|partition|storage access/i, "Rules about whether a site embedded inside another site can use its own storage. Tightening them is how browsers have been breaking cross-site tracking."],
  [/service.?worker/i, "A script a site can leave running in the background, even after you close the tab, to handle network requests and caching."],
  [/webrtc|ice|candidate|mdns/i, "The video-calling technology built into browsers. Setting up a call requires listing your network addresses, which historically leaked your real local address even behind a VPN."],
  [/\brtt\b|downlink|effectivetype|save.?data|connection\./i, "Live measurements of your internet connection: round-trip delay, estimated bandwidth, and whether you have asked for a data-saving mode."],
  [/devicepixelratio|\bdpr\b/i, "How many physical screen pixels make up one layout pixel. 2 or 3 means a high-resolution display; 1 usually means an older or cheaper monitor."],
  [/viewport|innerwidth|innerheight|outerwidth|outerheight/i, "The size of the area the page is drawn into, versus the size of the whole browser window. The difference reveals toolbars, and whether developer tools are open."],
  [/prefers-|forced-colors|inverted-colors|color-gamut|dynamic-range|monochrome/i, "Settings your operating system shares with every website so pages can adapt — dark mode, reduced motion, high contrast, colour capability of your screen."],
  [/timezone|timeZone|offset|\bdst\b/i, "Where your computer's clock thinks it is. Handed over with no permission, and enough on its own to place you in a region."],
  [/locale|language|accept-language/i, "The languages you have told your operating system you read, in priority order. Sent on every single request."],
  [/permission/i, "Whether you have allowed, blocked, or not yet been asked about a capability. A site can read the current state without triggering a prompt."],
  [/codec|canplaytype|mediasource|mediarecorder/i, "Which video and audio formats your device can play or record. Support for the newest formats tracks closely with how new your hardware is."],
  [/\beme\b|widevine|playready|fairplay|clearkey|drm/i, "Copy-protection systems for streaming video. Which ones your device supports, and at what security level, identifies the platform and often the exact chip."],
  [/audiocontext|samplerate|latency|oscillator|dsp/i, "The browser's sound engine. Processing an inaudible tone produces slightly different numbers on different hardware, which is another identifier."],
  [/hardwareconcurrency|cores|deviceMemory|heap/i, "How many processor cores and how much memory your machine reports. Rounded for privacy, but still a decent proxy for how expensive the device was."],
  [/battery/i, "Charge level and whether you are plugged in. Removed from Firefox and Safari because it was being used to follow people between sites."],
  [/webdriver|automation|cdc_|headless|puppeteer|selenium|playwright/i, "Traces left by software that drives a browser automatically, rather than a person clicking. Used to separate bots from people — and to detect anti-detect tooling."],
  [/native|patched|prototype|tostring/i, "A check of whether the browser's own built-in functions have been modified. Privacy extensions modify them; the modification is visible, and is itself unusual."],
  [/worker/i, "A second JavaScript thread with no access to the page. Useful for cross-checking: tools that fake values on the main page often forget to fake them here."],
  [/header order|rawheaders|header count/i, "The sequence in which your browser lists its request headers. Each browser engine uses its own fixed order, so it betrays what you really are even if you change your user-agent line."],
  [/http version|keep-alive|socket|tcp|tls|encrypted/i, "Details of the underlying network connection, below the web page layer: protocol version, whether it was encrypted, and whether the connection was reused."],
  [/referer|referrer/i, "The page you were on immediately before this one. Your browser tells the new site about the old one by default."],
  [/navigation|timing|paint|domcontentloaded|transfersize/i, "Precise measurements of how this page loaded — network time, drawing time, bytes transferred."],
  [/wasm|webassembly|simd|jit|engine|v8|spidermonkey/i, "The engine that runs JavaScript. Different browsers use different engines, and each has quirks — exact error wording, rounding behaviour — that reveal which one you really have, no matter what you claim."],
  [/font/i, "Typefaces installed on your computer. Pages can work out which ones you have by measuring text width, with no permission, and the set follows the software you own."],
  [/system color|accentcolor|canvastext|highlight/i, "Colours defined by your operating system theme, including the accent colour you picked in settings, readable by any page."],
  [/refresh rate|\bhz\b/i, "How many times per second your display updates. 60 is standard; 120 indicates a newer laptop or a gaming monitor."],
  [/scrollbar/i, "Scrollbar width differs by operating system and settings — zero means overlay scrollbars, typical of macOS and phones."],
  [/incognito|private/i, "Private browsing keeps history off your own machine. It does not hide you from the site; the restrictions it imposes are detectable."],
  [/do not track|\bdnt\b|global privacy|gpc/i, "Signals asking sites not to track you. Do Not Track was voluntary and widely ignored; Global Privacy Control carries legal weight in some jurisdictions."],
  [/blocker|bait|adsbox/i, "A test for ad and tracker blockers: invisible decoy elements named after things blocklists remove. If they vanish, something is blocking."],
  [/mime|plugin/i, "File types and viewers your browser exposes. Once a rich source of identifying detail; now mostly frozen to a fixed list."],
  [/geolocation|latitude|longitude|accuracy/i, "Your position from the operating system's location service — satellite, nearby wi-fi networks and cell towers — usually accurate to a few metres."],
  [/clipboard/i, "What you last copied. Readable in full once you approve the prompt, with no indication afterwards that it was read."],
  [/idle|screen state/i, "Whether you are actively using the computer and whether your screen is locked, reported continuously in the background."],
  [/sensor|orientation|motion|accelerometer|gyroscope/i, "Motion sensors in phones and tablets. Their tiny manufacturing imperfections are unique to the individual handset and survive every reset."],
  [/xr|immersive/i, "Virtual and augmented reality support, which reveals whether a headset is attached."],
  [/bluetooth|\busb\b|serial|\bhid\b/i, "Interfaces for talking to physical devices plugged into your machine. Their mere presence identifies the browser; using them requires you to pick a device."],
  [/secure context|crossoriginisolated|isolated/i, "Security states of the page. Some capabilities are only available over HTTPS or when the page is isolated from other sites."],
];

export function lookupTerm(fieldName: string): string | undefined {
  for (const [re, def] of GLOSSARY) if (re.test(fieldName)) return def;
  return undefined;
}
