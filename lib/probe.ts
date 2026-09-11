
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

export const list = (a: unknown) => (Array.isArray(a) ? a.join(", ") : a);
