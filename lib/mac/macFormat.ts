/** Client-safe MAC format helpers (no DB / Node built-ins). */

/** Match billing / Stalker style (uppercase, colons). */
export function normalizeMacForLookup(raw: string): string {
  return raw.trim().toUpperCase().replace(/-/g, ":");
}

/** PHP `valid_mac` — six hex octets, colon or hyphen separators. */
export function isValidMacFormat(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  const withColons = normalizeMacForLookup(s);
  return /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(withColons);
}

export function validateMacFormat(raw: string): { ok: true; canonical: string } | { ok: false } {
  if (!isValidMacFormat(raw)) return { ok: false };
  return { ok: true, canonical: normalizeMacForLookup(raw) };
}
