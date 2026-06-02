export function randomUUID(): string {
  const c = globalThis.crypto as Crypto | undefined;

  // Prefer native implementation when available.
  if (c && "randomUUID" in c && typeof (c as Crypto).randomUUID === "function") {
    return (c as Crypto).randomUUID();
  }

  // RFC4122 v4 fallback using Web Crypto.
  if (c && typeof c.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);

    // Per RFC4122 §4.4
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Extremely defensive last resort (shouldn't happen in modern browsers/extension pages).
  return `id-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

