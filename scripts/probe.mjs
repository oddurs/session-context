/**
 * Drive a real Chrome against a running server and report what it finds.
 *
 * Most of this codebase does nothing under server rendering, and the failures
 * that matter — hydration mismatches, probes that never resolve — are invisible
 * to `next build`. This prints console errors, uncaught exceptions and a few
 * DOM counts so a change can be checked without a human looking at the page.
 *
 *   node scripts/probe.mjs [url] [wait-ms]
 */
import { spawn } from "node:child_process";

const URL_ = process.argv[2] ?? "http://localhost:3939/";
const WAIT = Number(process.argv[3] ?? 15000);

const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const chrome = spawn(CHROME, [
  "--headless=new",
  "--no-sandbox",
  "--remote-debugging-port=0",
  `--user-data-dir=${process.env.TMPDIR ?? "/tmp"}/session-context-probe`,
  "about:blank",
]);

let problems = 0;
let buffered = "";

chrome.stderr.on("data", async (chunk) => {
  buffered += chunk.toString();
  const match = /DevTools listening on (ws:\/\/\S+)/.exec(buffered);
  if (!match || globalThis.__started) return;
  globalThis.__started = true;
  await run(match[1]);
  chrome.kill();
  process.exit(problems ? 1 : 0);
});

async function run(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  let id = 0;
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve) => {
      const msgId = ++id;
      pending.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params, sessionId }));
    });

  await new Promise((resolve) => (ws.onopen = resolve));

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    }
    if (msg.method === "Runtime.exceptionThrown") {
      problems++;
      console.error(
        "EXCEPTION",
        msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text
      );
    }
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      problems++;
      console.error("console.error", msg.params.args.map((a) => a.value ?? a.description).join(" "));
    }
  };

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Runtime.enable", {}, sessionId);
  await send("Page.enable", {}, sessionId);
  await send("Page.navigate", { url: URL_ }, sessionId);
  await new Promise((resolve) => setTimeout(resolve, WAIT));

  const evaluate = async (expression) => {
    const result = await send(
      "Runtime.evaluate",
      { expression, returnByValue: true, awaitPromise: true },
      sessionId
    );
    return result.result?.value ?? result.exceptionDetails?.text;
  };

  const counts = {
    findings: await evaluate("document.querySelectorAll('article').length"),
    tables: await evaluate("document.querySelectorAll('section[id]').length"),
    rows: await evaluate("document.querySelectorAll('tbody tr').length"),
    unreported: await evaluate("document.querySelectorAll('tbody tr td span.italic').length"),
  };

  console.log(`${URL_}`);
  for (const [key, value] of Object.entries(counts)) console.log(`  ${key}: ${value}`);
  console.log(problems ? `  ${problems} console problem(s)` : "  no console errors");

  // A page that renders nothing is a pass by the console's standards and a
  // failure by any other, so assert that collection actually happened.
  // Only the data page collects; every other route is prose and is asked
  // merely to render something.
  const path = new URL(URL_).pathname;
  const minimum =
    path === "/" ? { findings: 20, tables: 30, rows: 600 } : { tables: 5, rows: 0, findings: 0 };
  for (const [key, floor] of Object.entries(minimum)) {
    if (Number(counts[key]) < floor) {
      problems += 1;
      console.error(`  expected at least ${floor} ${key}, found ${counts[key]}`);
    }
  }
}
