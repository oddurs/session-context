/**
 * Drive a real Safari against a running server, over classic WebDriver.
 *
 * Safari is the third engine and the strictest of the three: it partitions
 * storage, caps script-written cookie lifetime, and — the reason this script
 * exists — refuses to load a page's own subresources over plain http on
 * loopback when the policy asks for them to be upgraded. That failure looked
 * exactly like a Firefox-only bug until Safari showed the same symptom, which
 * is what finally identified it.
 *
 * Requires "Allow Remote Automation" in Safari's Develop menu, and a one-time
 * `safaridriver --enable`. Safari has no headless mode, so a window appears.
 *
 *   node scripts/probe-safari.mjs [url] [wait-ms]
 */
import { spawn } from "node:child_process";
import { runAssertions } from "./lib/assertions.mjs";

const URL_ = process.argv[2] ?? "http://localhost:3939/";
const WAIT = Number(process.argv[3] ?? 15000);
const PORT = Number(process.env.SAFARIDRIVER_PORT ?? 4599);

const driver = spawn("safaridriver", ["--port", String(PORT)], { stdio: "inherit" });

const endpoint = `http://127.0.0.1:${PORT}`;

/** Classic WebDriver is plain JSON over HTTP; no client library is needed. */
async function call(method, path, body) {
  const response = await fetch(`${endpoint}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  if (payload.value?.error) {
    throw new Error(`${payload.value.error}: ${payload.value.message ?? ""}`.trim());
  }
  return payload.value;
}

/** safaridriver takes a moment to bind; poll rather than guess a delay. */
async function waitForDriver() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      await fetch(`${endpoint}/status`);
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  return false;
}

let session;
try {
  if (!(await waitForDriver())) throw new Error(`safaridriver never bound to ${endpoint}`);

  ({ sessionId: session } = await call("POST", "/session", {
    capabilities: { alwaysMatch: { browserName: "safari" } },
  }));

  await call("POST", `/session/${session}/url`, { url: URL_ });
  await new Promise((resolve) => setTimeout(resolve, WAIT));

  const evaluate = (expression) =>
    call("POST", `/session/${session}/execute/sync`, {
      script: `return ${expression}`,
      args: [],
    });

  // Classic WebDriver has no console stream, so unlike the other two drivers
  // this one cannot count console errors — it asserts on what the page
  // actually rendered, which is where Safari's failures have shown up anyway.
  const found = await runAssertions(URL_, evaluate, { label: "safari", watchesConsole: false });
  await call("DELETE", `/session/${session}`).catch(() => {});
  driver.kill();
  process.exit(found ? 1 : 0);
} catch (error) {
  console.error(`  driver failed: ${error.message}`);
  if (/RWIApplication|timed out while connecting/.test(error.message)) {
    // Not a setup problem, though it reads like one: safaridriver leaves an
    // automation host behind after enough sessions and then refuses to start
    // another. Quitting Safari does not always clear it.
    console.error("  Safari's automation host is stuck, not misconfigured. Quit Safari,");
    console.error("  then `pkill -f safaridriver`; a log-out clears it when that does not.");
  } else {
    console.error("  Safari needs `safaridriver --enable` once, and Develop →");
    console.error("  Allow Remote Automation checked.");
  }
  if (session) await call("DELETE", `/session/${session}`).catch(() => {});
  driver.kill();
  process.exit(1);
}
