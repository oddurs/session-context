/**
 * Brotli-compress the built static assets.
 *
 * Next emits gzip only, and Railway's edge does not add Brotli, so the biggest
 * responses on the site travel about 20% heavier than they need to. This runs
 * after the build; `server.mjs` serves the `.br` files to clients that accept
 * them and falls back to the originals for everyone else.
 */
import { brotliCompressSync, constants } from "node:zlib";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = ".next/static";
const COMPRESSIBLE = /\.(js|css|json|svg|map|txt)$/;
const MIN_BYTES = 1024;

let files = 0;
let before = 0;
let after = 0;

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path);
      continue;
    }
    if (!COMPRESSIBLE.test(entry.name) || entry.name.endsWith(".br")) continue;

    const raw = readFileSync(path);
    if (raw.length < MIN_BYTES) continue;

    const compressed = brotliCompressSync(raw, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 11,
        [constants.BROTLI_PARAM_SIZE_HINT]: raw.length,
      },
    });
    // Keep the original if Brotli somehow does worse.
    if (compressed.length >= raw.length) continue;

    writeFileSync(`${path}.br`, compressed);
    files += 1;
    before += raw.length;
    after += compressed.length;
  }
}

try {
  statSync(ROOT);
} catch {
  console.log("precompress: no build output, skipping");
  process.exit(0);
}

walk(ROOT);
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(
  `precompress: ${files} files, ${kb(before)} → ${kb(after)} brotli ` +
    `(${(100 - (after / before) * 100).toFixed(0)}% smaller)`
);
