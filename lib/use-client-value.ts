import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * Read a value that only exists in the browser, without a server/client render
 * branch. React swaps the server snapshot for the client one during hydration,
 * so there is no mismatch and no setState inside an effect.
 */
export function useClientValue<T>(get: () => T, serverValue: T): T {
  return useSyncExternalStore(noSubscribe, get, () => serverValue);
}
