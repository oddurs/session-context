/**
 * What every browser is asked, so all three are asked the same thing.
 *
 * Chrome speaks CDP, Firefox speaks WebDriver BiDi and Safari speaks classic
 * WebDriver. The protocols have nothing in common, but the questions do — and
 * the bugs this project has actually shipped were browser-specific, so asking
 * Firefox and Safari a weaker set than Chrome is how they got through.
 *
 * Each driver supplies `evaluate`, which runs an expression in the page and
 * returns its value. Everything else lives here.
 */

/** Counts that say the page did its job rather than merely rendering. */
export const COUNTS = {
  findings: "document.querySelectorAll('article').length",
  tables: "document.querySelectorAll('section[id]').length",
  rows: "document.querySelectorAll('tbody tr').length",
  unreported: "document.querySelectorAll('tbody tr td span.italic').length",
  // The one question every route can be asked: is there anything on it? The
  // structural counts are all zero on a page that has no sections by design,
  // so without this the smallest route is the one nothing checks.
  chars: "document.body.innerText.replace(/\\s+/g, ' ').trim().length",
};

/**
 * "[object Object]" is what a structure looks like when something joined or
 * interpolated it by mistake. It reached production once, in a row a reader on
 * HN had to point out. Nothing renders it on purpose, so its presence anywhere
 * is a bug by definition.
 */
export const STRINGIFIED = `(() => {
  const hits = [];
  document.querySelectorAll('td, dd, p, span').forEach((el) => {
    if (el.children.length === 0 && el.textContent.includes('[object Object]')) {
      const row = el.closest('tr');
      hits.push(row ? row.cells[0].textContent.trim() : el.textContent.trim().slice(0, 40));
    }
  });
  return [...new Set(hits)].slice(0, 8).join(' | ');
})()`;

/**
 * "Tables never scroll sideways" is a rule this project states about itself,
 * and until now nothing checked it. One decorative hairline on /design was
 * drawn eighty characters wide — seven hundred pixels — and took the whole
 * page sideways on a phone for as long as the page has existed.
 *
 * The document's own scroll width is the fact that matters: an element wider
 * than the window is fine inside something that clips or scrolls it, and a
 * closed <details> lays its contents out without ever painting them. Only when
 * the document itself has somewhere to scroll is anything wrong, and then the
 * visible elements past the edge are worth naming.
 */
export const OVERFLOW = `(() => {
  const room = document.documentElement.clientWidth;
  if (document.documentElement.scrollWidth <= room + 1) return "";
  const past = [...document.querySelectorAll('body *')]
    .filter((el) => el.checkVisibility?.() !== false && el.getBoundingClientRect().right > room + 1)
    .map((el) => \`\${el.tagName.toLowerCase()}.\${String(el.className).split(' ').slice(0, 2).join('.')}\`);
  return \`\${document.documentElement.scrollWidth}px wide in a \${room}px window\` +
    (past.length ? \` — \${[...new Set(past)].slice(0, 5).join(', ')}\` : '');
})()`;

/**
 * A count that came up short says nothing about why. Ask the page what state
 * it is in: whether React attached, whether collection revealed, which passes
 * landed, whether it caught an error.
 */
export const PAGE_STATE = `JSON.stringify({
  hydrated: [...document.querySelectorAll('*')].slice(0, 300)
    .some(el => Object.keys(el).some(k => k.startsWith('__react'))),
  revealed: !document.querySelector('#plain')?.innerText.includes('None of this asks your permission'),
  phases: [...document.querySelectorAll('#plain li')].map(li => li.innerText.split('\\n')[0]).slice(0, 6),
  failure: document.querySelector('#plain')?.innerText.match(/Collection failed[^]{0,160}/)?.[0] ?? null,
  readyState: document.readyState,
  scripts: document.querySelectorAll('script').length,
})`;

/**
 * What each route has to have to count as working. Only `/` collects; the rest
 * are prose of very different sizes, and `/embed` is a single line inside a
 * frame with no sections at all — a blanket floor either passed everything or
 * failed that one forever. Floors sit well under the real numbers, so an
 * engine reporting less than Chrome does is not a failure; losing a third of
 * the page is.
 */
const FLOORS = {
  "/": { findings: 20, tables: 30, rows: 600, chars: 12000 },
  "/methods": { findings: 20, tables: 5, chars: 12000 },
  "/design": { tables: 5, chars: 4000 },
  "/privacy": { tables: 5, chars: 2000 },
  "/embed": { chars: 40 },
};

export function minimumFor(url) {
  // A route nobody listed still has to render something.
  return FLOORS[new URL(url).pathname] ?? { chars: 200 };
}

/**
 * Run the battery. Returns the number of problems found, having printed them.
 * `evaluate` takes an expression string and resolves to its value.
 */
export async function runAssertions(
  url,
  evaluate,
  { label = "", problems = 0, watchesConsole = true } = {}
) {
  // Console problems are counted by the driver and reported as their own line;
  // everything found here adds to the same total but is printed where it was
  // found, so a failing run says which check failed rather than a number.
  let count = problems;

  const stringified = await evaluate(STRINGIFIED);
  if (stringified) {
    count += 1;
    console.error(`  rendered [object Object] in: ${stringified}`);
  }

  const overflow = await evaluate(OVERFLOW);
  if (overflow) {
    count += 1;
    console.error(`  the page scrolls sideways: ${overflow}`);
  }

  const counts = {};
  for (const [key, expression] of Object.entries(COUNTS)) {
    counts[key] = await evaluate(expression);
  }

  console.log(`${url}${label ? `  [${label}]` : ""}`);
  for (const [key, value] of Object.entries(counts)) console.log(`  ${key}: ${value}`);
  console.log(
    !watchesConsole
      ? "  console not observable over this protocol"
      : problems
        ? `  ${problems} console problem(s)`
        : "  no console errors"
  );

  let short = false;
  for (const [key, floor] of Object.entries(minimumFor(url))) {
    if (Number(counts[key]) < floor) {
      count += 1;
      short = true;
      console.error(`  expected at least ${floor} ${key}, found ${counts[key]}`);
    }
  }

  if (short) console.error(`  page state: ${await evaluate(PAGE_STATE)}`);

  return count;
}
