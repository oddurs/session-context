/**
 * Plain-English definitions for the jargon that appears in field names.
 * Matched against a row's field name, longest pattern first, so a row like
 * "WebGL 1 · UNMASKED_RENDERER" picks up the WebGL explanation.
 */
export const GLOSSARY: [RegExp, string][] = [
  // ── specific fields, matched before the broader patterns below ──
  [/^visitorId$|^confidence|components collected|debug string/i, "The output of the composite fingerprinter: one identifier derived from dozens of signals, with the library's own estimate of how reliable it is."],
  [/domBlockers/i, "A check for ad and tracker blockers, performed by planting decoy elements that blocklists are known to remove."],
  [/fontPreferences|screenFrame|osCpu|vendorFlavors|cpuClass|openDatabase|applePay|privateClickMeasurement/i, "One entropy source sampled by the fingerprinting library. Individually weak; the combination is what identifies."],
  [/assigned identifier|recovered from|storage mechanisms|copy \(before\)|respawn|visit count|first seen/i, "Part of the respawning demonstration: one identifier written to several stores at once, then restored from whichever copy survived."],
  [/etag|revalidat/i, "An identifier living in the HTTP cache rather than in site data. The browser returns it whenever it checks whether its cached copy is still fresh, so clearing cookies does not remove it."],
  [/probes in the stylesheet|probes that matched|javascript was disabled/i, "Results of the CSS-only fingerprint: one style rule per condition, each loading a different image, so the server learns which conditions were true without running any script."],
  [/frame's origin|frame recognized|third-party (cookie|localStorage)|partition|referrer passed/i, "Behavior of an embedded frame from a different origin — the position an advertising tag occupies on a normal site."],
  [/dwell|flight|typing speed|distance from stored|verdict|keystrokes/i, "Keystroke dynamics: how long keys are held and how long the gaps between them last. Stable enough per person to work as a biometric, with no permission prompt."],
  [/pointermove|click events|keydown events|scroll events|visibility changes|time on page|pointer speed|curvature|acceleration|movement samples/i, "Live observation of how you are using this page. Ordinary events, readable by any script, and enough to describe your hand."],
  [/benchmark run|drift across|composite score|float math|typed array|sha-256|fastest run|slowest run/i, "Timed work used to classify the device. Absolute speed suggests what the machine cost; how it slows down suggests its cooling and power state."],
  [/pressure/i, "The Compute Pressure API, which reports how loaded the processor currently is — and therefore what else you are running."],
  [/other tabs|broadcastchannel|sharedworker|locks|storage events/i, "Channels that let tabs of the same site see each other, so anything learned in one tab is available in all of them."],
  [/max_texture|max_viewport|max_renderbuffer|vertex_attribs|texture_image_units|aliased|shading_language|antialias|extension/i, "A capability limit reported by the graphics driver. The exact combination is characteristic of one GPU and driver version."],
  [/decodinginfo|powerefficient|smooth|h\.26|av1|vp9|opus/i, "Whether this format decodes at all, decodes smoothly, and decodes in hardware. Hardware support closely tracks the chipset."],
  [/getinstalledrelatedapps/i, "Detects whether a companion native or installed web app is present on the device."],
  [/audioinput|videoinput|audiooutput|getsupportedconstraints|getdisplaymedia|device\[/i, "Recording and playback hardware. The count is visible with no permission; names and stable identifiers require one."],
  [/immersive|xr\./i, "Virtual and augmented reality support, which indicates whether a headset is attached."],
  [/keyboard layout|maps to/i, "The physical keyboard layout, which usually indicates the country the machine was bought in."],
  [/samplerate|baselatency|outputlatency|maxchannelcount|channelinterpretation|destination\./i, "Properties of the actual audio output device, including its sample rate and channel count."],
  [/speechsynthesis|voice list/i, "Installed text-to-speech voices. The set is strongly tied to the operating system, its version and the languages installed."],
  [/x-forwarded|x-real-ip|host requested|request line|proxy chain/i, "Address information added by proxies, or read from the connection itself."],
  [/accept-encoding|upgrade-insecure|priority|^accept$|sec-fetch/i, "A request header the browser sends on its own. Each describes what the browser will accept, or the context the request was made in."],
  [/server epoch|server uptime|server time|runtime/i, "The server's own state at the moment of the request. Comparing its clock with yours measures the drift of your machine's clock, which is itself an identifier."],
  [/cookie (bytes|names)|cookies sent/i, "What your browser sent back from earlier visits, before any script ran."],
  [/screen\.(width|height|avail|color|pixel)|orientation|isextended/i, "Physical display geometry, reported without permission. A second screen and an unusual resolution both narrow you down."],
  [/inner(width|height)|outer(width|height)|screenx|screeny|chrome height|clientwidth|clientheight|scrollx/i, "The size of the window and the space the page was given. The difference exposes browser chrome, and often whether developer tools are open."],
  [/history\.length|window\.name|opener|framed|activeelement|readystate|visibilitystate|hasfocus|designmode|lastmodified|compatmode|characterset|contenttype|fullscreenenabled/i, "Ambient state of this document: how many pages you have visited in this tab, whether it is embedded, and whether you are looking at it."],
  [/maxtouchpoints|pdfviewerenabled|javaenabled|productsub|vendorsub|appcodename|appname|appversion|oscpu|buildid|useractivation/i, "A legacy `navigator` property. Several are now frozen to fixed values precisely because they were used to identify people."],
  [/notification|permission state/i, "Whether a capability is allowed, blocked, or has never been asked about — readable without showing a prompt."],
  [/^latitude|^longitude|^accuracy|^altitude|^heading|^speed$/i, "A reading from the operating system's location service, accurate to the meters shown."],
  [/clipboard (length|contents|item)/i, "The contents of your clipboard, handed over in full once the prompt is approved."],
  [/screens attached|screen\[|current screen label/i, "Every display attached to the machine, including its position on the virtual desktop and its manufacturer label."],
  [/user state|screen state/i, "Whether you are actively using the computer and whether the screen is locked, reported continuously in the background."],
  [/orientation sample|motion sample|α |absolute=/i, "Raw motion-sensor output. Calibration noise in these readings is unique to the individual physical device."],
  [/appears to be installed|no response|scheme flooding/i, "Detected by asking the browser to open an application's private URL and watching whether this window lost focus."],
  [/not exposed to workers|mismatch|main:/i, "The same value read on the page and inside a Web Worker. A mismatch means something is rewriting the value on the page only."],
  [/automation globals|chromedriver|prototype chain|tostring tag|iframe contentwindow|descriptor/i, "Integrity checks on the JavaScript environment, used to spot automated browsers and tools that patch built-in functions."],

  [/user.?agent|^ua\b|userAgent/i, "A line of text your browser announces itself with on every request — its name, version and operating system. It is freely editable, which is why sites cross-check it against everything else."],
  [/client hint|sec-ch-/i, "A newer, structured replacement for the user-agent line. The server asks for specific details (processor type, exact version, screen width) and the browser then attaches them to every following request automatically."],
  [/canvas/i, "A drawing surface web pages use for graphics. Because your graphics card, drivers and fonts all affect the exact pixels produced, the same drawing comes out subtly different on different machines — which makes it an identifier."],
  [/webgl|webgpu|unmasked|renderer|gpu/i, "The interface that lets web pages use your graphics chip. It hands over the chip's full model name and capabilities without asking permission."],
  [/fingerprint|visitorid|hash|digest/i, "A short code summarizing many small details about your device. Feed the same device in and you get the same code out, which lets a site recognize you without storing anything on your machine."],
  [/entropy|confidence/i, "A measure of how much a detail narrows you down. A detail that splits the world in half is worth little; one that only a thousand people share is worth a lot."],
  [/indexeddb|localstorage|sessionstorage|cachestorage|cookiestore|storage\.|quota|usage/i, "Places a website can save data inside your browser. They are separate systems, so clearing one does not clear the others — which is how a deleted identifier can come back."],
  [/cookie/i, "A small piece of text a site stores in your browser and gets back on every later visit. The original tracking mechanism, and now the least of the problem."],
  [/samesite|partition|storage access/i, "Rules about whether a site embedded inside another site can use its own storage. Tightening them is how browsers have been breaking cross-site tracking."],
  [/service.?worker/i, "A script a site can leave running in the background, even after you close the tab, to handle network requests and caching."],
  [/webrtc|ice|candidate|mdns/i, "The video-calling technology built into browsers. Setting up a call requires listing your network addresses, which historically leaked your real local address even behind a VPN."],
  [/\brtt\b|downlink|effectivetype|save.?data|connection\./i, "Live measurements of your internet connection: round-trip delay, estimated bandwidth, and whether you have asked for a data-saving mode."],
  [/devicepixelratio|\bdpr\b/i, "How many physical screen pixels make up one layout pixel. 2 or 3 means a high-resolution display; 1 usually means an older or cheaper monitor."],
  [/viewport|innerwidth|innerheight|outerwidth|outerheight/i, "The size of the area the page is drawn into, versus the size of the whole browser window. The difference reveals toolbars, and whether developer tools are open."],
  [/prefers-|forced-colors|inverted-colors|color-gamut|dynamic-range|monochrome/i, "Settings your operating system shares with every website so pages can adapt — dark mode, reduced motion, high contrast, color capability of your screen."],
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
  [/wasm|webassembly|simd|jit|engine|v8|spidermonkey/i, "The engine that runs JavaScript. Different browsers use different engines, and each has quirks — exact error wording, rounding behavior — that reveal which one you really have, no matter what you claim."],
  [/font/i, "Typefaces installed on your computer. Pages can work out which ones you have by measuring text width, with no permission, and the set follows the software you own."],
  [/system color|accentcolor|canvastext|highlight/i, "Colors defined by your operating system theme, including the accent color you picked in settings, readable by any page."],
  [/refresh rate|\bhz\b/i, "How many times per second your display updates. 60 is standard; 120 indicates a newer laptop or a gaming monitor."],
  [/scrollbar/i, "Scrollbar width differs by operating system and settings — zero means overlay scrollbars, typical of macOS and phones."],
  [/incognito|private/i, "Private browsing keeps history off your own machine. It does not hide you from the site; the restrictions it imposes are detectable."],
  [/do not track|\bdnt\b|global privacy|gpc/i, "Signals asking sites not to track you. Do Not Track was voluntary and widely ignored; Global Privacy Control carries legal weight in some jurisdictions."],
  [/blocker|bait|adsbox/i, "A test for ad and tracker blockers: invisible decoy elements named after things blocklists remove. If they vanish, something is blocking."],
  [/mime|plugin/i, "File types and viewers your browser exposes. Once a rich source of identifying detail; now mostly frozen to a fixed list."],
  [/geolocation|latitude|longitude|accuracy/i, "Your position from the operating system's location service — satellite, nearby wi-fi networks and cell towers — usually accurate to a few meters."],
  [/clipboard/i, "What you last copied. Readable in full once you approve the prompt, with no indication afterwards that it was read."],
  [/idle|screen state/i, "Whether you are actively using the computer and whether your screen is locked, reported continuously in the background."],
  [/sensor|orientation|motion|accelerometer|gyroscope/i, "Motion sensors in phones and tablets. Their tiny manufacturing imperfections are unique to the individual handset and survive every reset."],
  [/xr|immersive/i, "Virtual and augmented reality support, which reveals whether a headset is attached."],
  [/bluetooth|\busb\b|serial|\bhid\b/i, "Interfaces for talking to physical devices plugged into your machine. Their mere presence identifies the browser; using them requires you to pick a device."],
  [/secure context|crossoriginisolated|isolated/i, "Security states of the page. Some capabilities are only available over HTTPS or when the page is isolated from other sites."],
];

/**
 * Fallback context per section, so a field with no specific entry still
 * explains where it came from and why it matters.
 */
export const SECTION_CONTEXT: Record<string, string> = {
  "request-headers": "A header your browser attached to the request for this page, before any script ran. Sent on every request, to every site.",
  "client-hints": "A value your browser volunteered because this server asked for it with Accept-CH. Higher precision than the user-agent string, and sent automatically once requested.",
  connection: "A fact read from the network connection itself, below the web-page layer.",
  "server-derived": "Something the server worked out from the request. No external service was consulted.",
  "css-noscript": "Learned from CSS alone — a style rule matched and fetched its image. Disabling JavaScript does not prevent this.",
  "visitor-id": "Part of the composite identifier that recognizes this browser on a later visit without storing anything.",
  "fp-components": "One entropy source sampled by the fingerprinting library, with how long it took to read.",
  fingerprints: "A digest of how this machine renders or processes something. Identical hardware and software produce identical digests.",
  persistence: "Part of the respawning demonstration: one identifier written across several independent stores.",
  worker: "The same value read inside a Web Worker, to catch values that are being faked on the page only.",
  tamper: "An integrity check on the JavaScript environment, used to detect automation and patched built-in functions.",
  privacy: "A privacy defense, and whether it is detectable — which is itself a signal.",
  "third-party": "Behavior of an embedded frame from another origin, the position an advertising tag occupies.",
  navigator: "A property of the `navigator` object, readable by any script with no permission.",
  "ua-parsed": "Inferred from the user-agent string alone, the way analytics platforms parse it.",
  "ua-client-hints": "A structured client-hint value, requested by the page rather than broadcast.",
  features: "Whether this platform API exists here. The exact combination narrows down browser, version and operating system.",
  engine: "A quirk of the JavaScript engine, which reveals the real browser even when the user-agent string says otherwise.",
  fonts: "Detected by measuring text width off-screen — no permission needed. Installed fonts follow the software you own.",
  screen: "Display and window geometry, readable without permission.",
  "system-ui": "Resolved from your operating system's theme and settings, and shared with every page you open.",
  hardware: "What the machine reports about its own hardware, or which device APIs this browser exposes at all.",
  graphics: "Reported by the graphics driver, which names the exact chip with no prompt.",
  benchmark: "Timed work used to classify the device, independent of anything it claims about itself.",
  thermal: "Repeated measurements showing how the machine behaves under sustained load.",
  audio: "A property of the real audio output device, or of the installed speech voices.",
  codecs: "Which media formats this device can play, record or decrypt.",
  "media-capabilities": "Whether a format decodes smoothly and in hardware — effectively a chipset signature.",
  devices: "Attached cameras, microphones and speakers. Counting them needs no permission.",
  network: "Live measurements of your internet connection, reported to any page that asks.",
  preferences: "A setting your operating system shares with every website so pages can adapt.",
  locale: "Your region and language settings, handed over with no permission.",
  document: "State of this page: where it sits, what linked here, and whether you are looking at it.",
  storage: "Origin-scoped storage. Quota is derived from free disk space, which makes it a personal number.",
  permissions: "The current state of one permission, readable without showing a prompt.",
  performance: "The browser's own measurement of how this page load went.",
  interaction: "Observed live as you use the page. No permission is involved.",
  "cross-tab": "A channel that lets tabs of this site see and talk to each other.",
  typing: "Measured from the rhythm of your typing and pointer movement, not from what you typed.",
  geolocation: "From the operating system's location service, after you approved the prompt.",
  "local-fonts": "The real installed font list, straight from the operating system, after approval.",
  "device-labels": "Hardware names and stable identifiers revealed by granting camera or microphone access.",
  "screen-details": "Every attached display, revealed by the window-management permission.",
  clipboard: "Read from your clipboard after you approved the prompt.",
  idle: "Whether you are at the keyboard, reported continuously after approval.",
  sensors: "Motion-sensor output, whose calibration noise is unique to the physical device.",
  schemes: "Detected by asking the browser to open an application's private URL scheme.",
};

import {
  COMPONENT_NOTES,
  CSS_PROBE_NOTES,
  FEATURE_NOTES,
  FIELD_NOTES,
  PERMISSION_NOTES,
  RUN_NOTES,
  SYSTEM_COLOR_NOTES,
} from "./field-notes";

/** Codec strings appear inside longer field names, so they match by fragment. */
const CODEC_NOTES: [RegExp, string][] = [
  [/avc1|h\.264/i, "H.264, the format everything plays. Supported since 2010, so it says little on its own."],
  [/hvc1|hev1|h\.265/i, "HEVC. Playback needs a hardware decoder and a licence, so support implies Apple silicon or a recent Intel or AMD chip."],
  [/av01|av1/i, "AV1, the royalty-free successor to HEVC. Hardware decoding means a 2021-or-later GPU or phone."],
  [/vp09|vp9/i, "VP9, Google's codec, used by YouTube. Widely decoded in hardware since about 2016."],
  [/vp8/i, "VP8, the older WebM codec, decoded in software almost everywhere."],
  [/opus/i, "Opus, the default voice and music codec for WebRTC and WebM."],
  [/vorbis/i, "Vorbis, the codec Opus replaced."],
  [/flac/i, "FLAC, lossless audio. Support indicates a fairly complete media stack."],
  [/mp4a\.40\.2|aac/i, "AAC, the standard MP4 audio codec, which needs a licence and so is absent from some builds."],
  [/ec-3|eac3/i, "Dolby Digital Plus. Support usually means licensed hardware, which narrows the device considerably."],
  [/audio\/mpeg|mp3/i, "MP3, supported everywhere since its patents expired."],
  [/audio\/wav/i, "Uncompressed WAV audio."],
  [/mpegurl|hls/i, "HLS streaming, natively supported by Safari and generally not by others."],
  [/ogg/i, "The Ogg container, associated with open-source codecs."],
  [/clearkey/i, "Clear Key, the unencrypted reference DRM every browser implements."],
  [/widevine/i, "Widevine, Google's DRM. The security level it reports decides whether a service will stream HD to you."],
  [/playready/i, "PlayReady, Microsoft's DRM, which implies Windows or an Edge-based device."],
  [/fps|fairplay/i, "FairPlay, Apple's DRM. Support means an Apple platform."],
];

export function lookupTerm(fieldName: string, sectionId?: string): string | undefined {
  const key = fieldName.trim().toLowerCase();

  // Most specific first: a note written for this field in this section.
  if (sectionId) {
    const scoped = FIELD_NOTES[`${sectionId}::${key}`];
    if (scoped) return scoped;
  }
  const exact = FIELD_NOTES[key];
  if (exact) return exact;

  // Enumerated families, keyed by their own item names.
  if (sectionId === "features" && FEATURE_NOTES[fieldName.trim()]) return FEATURE_NOTES[fieldName.trim()];
  if (sectionId === "permissions" && PERMISSION_NOTES[fieldName.trim()]) return PERMISSION_NOTES[fieldName.trim()];
  if (sectionId === "fp-components" && COMPONENT_NOTES[fieldName.trim()]) return COMPONENT_NOTES[fieldName.trim()];
  if (sectionId === "system-ui" && fieldName.includes("·")) {
    const keyword = fieldName.split("·")[1]?.trim();
    if (keyword && SYSTEM_COLOR_NOTES[keyword]) return SYSTEM_COLOR_NOTES[keyword];
  }
  if (sectionId === "css-noscript" && CSS_PROBE_NOTES[fieldName.trim()])
    return CSS_PROBE_NOTES[fieldName.trim()];
  if (RUN_NOTES[key]) return RUN_NOTES[key];
  if (sectionId === "codecs" || sectionId === "media-capabilities") {
    for (const [re, def] of CODEC_NOTES) if (re.test(fieldName)) return def;
  }

  // Generated names (device[2], benchmark run 3, WebGL 1 · MAX_TEXTURE_SIZE).
  for (const [re, def] of GLOSSARY) if (re.test(fieldName)) return def;
  return sectionId ? SECTION_CONTEXT[sectionId] : undefined;
}
