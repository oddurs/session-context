/**
 * Drive a real Firefox against a running server, over WebDriver BiDi.
 *
 * Chrome is not a stand-in for the other two engines. Every browser-specific
 * failure this project has had was invisible in Chrome and obvious here: the
 * page loaded its markup and then never hydrated, with no error to explain it,
 * because `upgrade-insecure-requests` was rewriting its own script URLs to a
 * port nothing was listening on — Chrome exempts loopback, Gecko does not.
 * A Chrome-only test suite passes all of that.
 *
 * Firefox 129+ speaks BiDi directly, so this needs no geckodriver: launching
 * with a remote-debugging port prints a WebSocket URL, and the session is
 * negotiated on it.
 *
 *   node scripts/probe-firefox.mjs [url] [wait-ms] [viewport-width]
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runAssertions } from "./lib/assertions.mjs";

const URL_ = process.argv[2] ?? "http://localhost:3939/";
const WAIT = Number(process.argv[3] ?? 15000);
const WIDTH = Number(process.argv[4] ?? 0);

const FIREFOX =
  process.env.FIREFOX_PATH ?? "/Applications/Firefox.app/Contents/MacOS/firefox";

// A throwaway profile each run, so a previous run's storage cannot make the
// respawn and ETag demonstrations look like they work when they do not.
const profile = mkdtempSync(join(tmpdir(), "session-context-firefox-"));

const firefox = spawn(FIREFOX, [
  "--headless",
  "--no-remote",
  "--profile", profile,
  "--remote-debugging-port=0",
  "about:blank",
]);

let problems = 0;
let buffered = "";
let started = false;

firefox.stderr.on("data", async (chunk) => {
  buffered += chunk.toString();
  const match = /WebDriver BiDi listening on (ws:\/\/\S+)/.exec(buffered);
  if (!match || started) return;
  started = true;
  let found = 1;
  try {
    // Firefox announces the origin; the session endpoint is one path below it.
    found = await run(`${match[1].replace(/\/$/, "")}/session`);
  } catch (error) {
    console.error(`  driver failed: ${error.message}`);
  } finally {
    firefox.kill();
    rmSync(profile, { recursive: true, force: true });
  }
  process.exit(found ? 1 : 0);
});

firefox.on("exit", (code) => {
  if (started) return;
  console.error(`Firefox exited before announcing a BiDi port (code ${code}).`);
  console.error(buffered.trim().split("\n").slice(-5).join("\n"));
  rmSync(profile, { recursive: true, force: true });
  process.exit(1);
});

async function run(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  let id = 0;

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const msgId = ++id;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error(`could not connect to ${wsUrl}`));
  });

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    const waiting = pending.get(msg.id);
    if (waiting) {
      pending.delete(msg.id);
      if (msg.type === "error") waiting.reject(new Error(`${msg.error}: ${msg.message}`));
      else waiting.resolve(msg.result);
    }
    // Gecko reports uncaught exceptions and console.error through one stream.
    if (msg.type === "event" && msg.method === "log.entryAdded") {
      const entry = msg.params;
      if (entry.level !== "error") return;
      // One row of the table — "eval allowed (CSP)" — calls eval on purpose to
      // find out whether the policy permits it, and the answer it reports is
      // "no" precisely because this fires. Gecko surfaces the violation where
      // Chrome does not, so without this the driver fails every clean run.
      // Nothing distinguishes this violation from a real one in the text, and
      // the page provokes exactly one, so it is matched and dropped.
      if (/blocked a JavaScript eval/.test(entry.text ?? "")) return;
      problems += 1;
      console.error(
        entry.type === "javascript" ? "EXCEPTION" : "console.error",
        entry.text ?? entry.stackTrace?.callFrames?.[0]?.functionName ?? ""
      );
    }
  };

  await send("session.new", { capabilities: { alwaysMatch: {} } });
  await send("session.subscribe", { events: ["log.entryAdded"] });

  const { contexts } = await send("browsingContext.getTree", {});
  const context = contexts[0].context;

  if (WIDTH) {
    await send("browsingContext.setViewport", {
      context,
      viewport: { width: WIDTH, height: 844 },
      devicePixelRatio: 3,
    });
  }
  await send("browsingContext.navigate", { context, url: URL_, wait: "complete" });
  await new Promise((resolve) => setTimeout(resolve, WAIT));

  const evaluate = async (expression) => {
    const result = await send("script.evaluate", {
      expression,
      target: { context },
      awaitPromise: true,
      resultOwnership: "none",
    });
    if (result.type === "exception") return result.exceptionDetails?.text ?? "threw";
    // BiDi returns a tagged remote value rather than the value itself.
    return result.result?.value ?? (result.result?.type === "null" ? null : undefined);
  };

  return runAssertions(URL_, evaluate, { label: WIDTH ? `firefox ${WIDTH}px` : "firefox", problems });
}
