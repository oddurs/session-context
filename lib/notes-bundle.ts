/**
 * The tooltip prose: every per-field definition, plus the resolver that picks
 * the most specific one.
 *
 * This module is a quarter of the page's JavaScript and none of it is needed
 * until someone hovers a field name, so it is imported lazily by
 * `lib/notes.ts` rather than in the initial bundle.
 */
import { GLOSSARY, SECTION_CONTEXT } from "./glossary";
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
