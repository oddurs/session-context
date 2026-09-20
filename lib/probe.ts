import type { GatedResult, Section } from "./types";


/** Read a possibly-missing value without throwing. `undefined` = unsupported. */
export function probe<T>(fn: () => T): T | string | undefined {
  try {
    const v = fn();
    return v === undefined ? undefined : v;
  } catch (e) {
    return `error: ${(e as Error).message}`;
  }
}

export async function probeAsync<T>(
  fn: () => Promise<T>,
  ms = 3000
): Promise<T | string | undefined> {
  try {
    return await Promise.race([
      fn(),
      new Promise<string>((res) => setTimeout(() => res("timed out"), ms)),
    ]);
  } catch (e) {
    return `error: ${(e as Error).message}`;
  }
}

/**
 * Render a list of collected values.
 *
 * Joining an array of objects produces "[object Object]" for every entry,
 * which is how the FingerprintJS plugins row shipped. Anything holding
 * structure is handed over as JSON instead, and the table renders that as a
 * collapsible block rather than a lie.
 */
export const list = (a: unknown) => {
  if (!Array.isArray(a)) return a;
  return a.some((item) => item !== null && typeof item === "object")
    ? JSON.stringify(a)
    : a.join(", ");
};

/**
 * Turn a failed gated call into an honest outcome.
 *
 * `NotAllowedError` is the only name that means a person said no — or that the
 * browser refused on their behalf. `NotFoundError` and `NotSupportedError`
 * mean the capability was never there to grant. Everything else is a fault,
 * and saying so beats blaming the reader for it.
 */
/**
 * NotAllowedError covers two facts that are not the same one: you saw a prompt
 * and refused it, and no prompt was ever shown because the call did not happen
 * inside a click. Only the message separates them. Reporting the second as a
 * refusal would have this page inventing an answer the reader never gave.
 */
const NO_GESTURE = /user (gesture|activation)|transient activation|requires a gesture|user action/i;

export function classifyDomError(
  e: unknown,
  section: Section,
  missingReason = "This browser or machine does not provide it."
): GatedResult {
  const name = (e as DOMException)?.name;
  if (name === "NotAllowedError" && NO_GESTURE.test((e as Error)?.message ?? ""))
    return {
      section,
      outcome: "error",
      reason:
        "No prompt was shown. The browser only offers this one in response to a click or a tap, and the request did not arrive inside one — so nothing here was refused.",
    };
  if (name === "NotAllowedError" || name === "SecurityError")
    return { section, outcome: "denied" };
  if (name === "NotFoundError" || name === "NotSupportedError" || name === "TypeError")
    return { section, outcome: "unsupported", reason: missingReason };
  return {
    section,
    outcome: "error",
    reason: `The call failed: ${(e as Error)?.message ?? "unknown error"}.`,
  };
}
