/**
 * Generates an RFC 4122 version 4 UUID, including in browsers that do not
 * implement crypto.randomUUID().
 */
export function generateUUID(): string {
  const browserCrypto = globalThis.crypto;

  if (typeof browserCrypto?.randomUUID === "function") {
    return browserCrypto.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (typeof browserCrypto?.getRandomValues === "function") {
    browserCrypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  // RFC 4122: version 4 and variant 1 bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

/** Generates a Storage-safe id even when local HTTP does not expose Web Crypto. */
export function generateSafeId(): string {
  const nativeId = globalThis.crypto?.randomUUID?.();
  if (nativeId) return nativeId;
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
}
