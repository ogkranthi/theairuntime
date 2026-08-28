/**
 * Stable client-side ids for canvas nodes and edges.
 *
 * `crypto.randomUUID` only exists in a secure context, and it arrived in Safari
 * 15.4, so it is missing on plain HTTP and in some embedded webviews. The
 * architecture canvas is the core interaction of the interview: if id creation
 * throws, the candidate cannot add a single component and the failure is
 * silent. These ids only need to be unique within one browser session, so a
 * random fallback is sufficient.
 */
export function createId(): string {
  const runtimeCrypto = globalThis.crypto;

  if (typeof runtimeCrypto?.randomUUID === "function") {
    return runtimeCrypto.randomUUID();
  }

  if (typeof runtimeCrypto?.getRandomValues === "function") {
    const bytes = runtimeCrypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
