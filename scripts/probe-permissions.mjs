/**
 * Drive the permission ledger the way a person does, and check what it says.
 *
 * Everything else here reads a page that asked for nothing. The ledger is the
 * part of this site that asks, and its four outcomes — granted, denied,
 * unsupported, error — are the one place the page is most able to say
 * something untrue about the reader. Nothing tested it until this.
 *
 * Every permission is granted up front through the DevTools Protocol, and each
 * row is then clicked with a real mouse event rather than `element.click()`,
 * because the browser only offers some of these prompts inside a genuine
 * gesture. With everything already allowed, no row may report a refusal: a
 * "declined" here is the page inventing an answer the reader never gave, and
 * that is what this fails on. "Failed" and "not available" are honest answers
 * on a machine with no sensors and no location fix, and are allowed.
 *
 *   node scripts/probe-permissions.mjs [url]
 */
import { spawn } from "node:child_process";

const URL_ = process.argv[2] ?? "http://localhost:3939/";

const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/**
 * Scheme flooding is left alone: it is the one intrusive probe, it can launch
 * desktop applications, and it is behind a confirmation for that reason.
 */
const SKIP = /^Installed desktop applications/;

/**
 * A refusal that nobody made. The whole point of the run.
 *
 * Anchored to the caption, which follows the capability's name immediately —
 * matching anywhere in the row would catch the sentence a genuinely blocked
 * row prints about having been blocked, and call the page a liar for being
 * honest.
 */
const REFUSED = /^\s*(declined|blocked)\b/;

const chrome = spawn(CHROME, [
  "--headless=new",
  "--no-sandbox",
  // A camera and a microphone that exist, so the media rows have something to
  // report other than "no device".
  "--use-fake-device-for-media-stream",
  "--use-fake-ui-for-media-stream",
  "--remote-debugging-port=0",
  `--user-data-dir=${process.env.TMPDIR ?? "/tmp"}/session-context-permissions`,
  "about:blank",
]);

let buffered = "";
let started = false;

chrome.stderr.on("data", async (chunk) => {
  buffered += chunk.toString();
  const match = /DevTools listening on (ws:\/\/\S+)/.exec(buffered);
  if (!match || started) return;
  started = true;
  let failures = 1;
  try {
    failures = await run(match[1]);
  } catch (error) {
    console.error(`  driver failed: ${error.message}`);
  } finally {
    chrome.kill();
  }
  process.exit(failures ? 1 : 0);
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
  };

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Runtime.enable", {}, sessionId);
  await send("Page.enable", {}, sessionId);
  await send("Browser.grantPermissions", {
    origin: new URL(URL_).origin,
    permissions: [
      "geolocation", "audioCapture", "videoCapture", "clipboardReadWrite",
      "clipboardSanitizedWrite", "sensors", "idleDetection", "windowManagement",
    ],
  });
  await send("Page.navigate", { url: URL_ }, sessionId);
  await new Promise((resolve) => setTimeout(resolve, 18000));

  const evaluate = async (expression) => {
    const result = await send(
      "Runtime.evaluate",
      { expression, returnByValue: true, awaitPromise: true },
      sessionId
    );
    return result.result?.value ?? result.exceptionDetails?.text;
  };

  const row = (name) =>
    `[...document.querySelectorAll('li')].find((x) => x.innerText.startsWith(${JSON.stringify(name)}))`;

  const names = JSON.parse(
    await evaluate(`JSON.stringify([...document.querySelectorAll('li')]
      .filter((l) => l.querySelector('button') && !l.querySelector('button').disabled)
      .map((l) => l.innerText.split('\\n')[0]))`)
  );

  const askable = names.filter((n) => !SKIP.test(n));
  if (askable.length < 4) {
    console.error(`  only ${askable.length} capabilities offered a prompt — the ledger did not render`);
    return 1;
  }

  let failures = 0;
  for (const name of askable) {
    // The ledger runs one capability at a time and disables every other button
    // while one is in flight — deliberately, so two prompts cannot stack up.
    // Geolocation on a machine with no fix holds that lock for its full
    // twenty-second timeout, and clicking through it does nothing at all.
    for (let waited = 0; waited < 30000; waited += 500) {
      if (await evaluate(`!${row(name)}.querySelector('button').disabled`)) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const before = await evaluate(`${row(name)}.innerText.replace(/\\s+/g, ' ')`);
    let landed = false;

    // A row that has just opened is still animating, and the row above it may
    // still be expanding into its result, so the button moves out from under
    // the pointer between reading its position and clicking it. Aim again
    // until the row reacts, rather than assuming one click arrived.
    for (let attempt = 0; attempt < 4 && !landed; attempt++) {
      await evaluate(`${row(name)}.querySelector('button').scrollIntoView({ block: 'center', behavior: 'instant' })`);
      await new Promise((resolve) => setTimeout(resolve, 700));

      const box = await evaluate(
        `(() => { const r = ${row(name)}.querySelector('button').getBoundingClientRect();
          return JSON.stringify([r.x + r.width / 2, r.y + r.height / 2]); })()`
      );
      const [x, y] = JSON.parse(box);
      // A real mouse event, not element.click(): several of these prompts are
      // offered only inside a genuine user gesture, and a synthetic click gets
      // an error the page would otherwise have to guess the meaning of.
      for (const type of ["mousePressed", "mouseReleased"]) {
        await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 }, sessionId);
      }

      for (let waited = 0; waited < 2500 && !landed; waited += 250) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        landed = (await evaluate(`${row(name)}.innerText.replace(/\\s+/g, ' ')`)) !== before;
      }
    }

    if (!landed) {
      failures += 1;
      console.log(`  NOCLICK ${name} — the button never responded`);
      continue;
    }
    // Read the answer, not the row on its way to one. A working row holds its
    // own button disabled, and geolocation on a machine with no fix holds it
    // for the full twenty-second timeout while its caption sits perfectly
    // still — so waiting for the text to stop changing recorded the spinner
    // as the outcome and never saw what came after it.
    for (let waited = 0; waited < 30000; waited += 500) {
      const idle = await evaluate(
        `(() => { const b = ${row(name)}.querySelector('button'); return !b || !b.disabled; })()`
      );
      if (idle) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    const text = await evaluate(`${row(name)}.innerText.replace(/\\s+/g, ' ')`);
    const caption = String(text).slice(name.length, name.length + 60).trim();
    const refused = REFUSED.test(String(text).slice(name.length));
    if (refused) failures += 1;
    console.log(`  ${refused ? "REFUSED" : "ok     "} ${name} — ${caption.split(" ").slice(0, 4).join(" ")}`);
  }

  console.log(
    failures
      ? `  ${failures} row(s) reported a refusal nobody made`
      : `  ${askable.length} capabilities asked, none reported a refusal`
  );
  return failures;
}
