/** MAC helpers for create-user flows (Infomir-style OUI). Client-safe — no DB imports. */

export { validateMacFormat } from "@/lib/mac/macFormat";

/** Common MAG / Infomir OUI used in billing placeholders. */
export const DEFAULT_MAC_OUI = "00:1A:79";

function randomOctet(): string {
  return Math.floor(Math.random() * 256)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
}

/** Random MAC `00:1A:79:XX:XX:XX` (canonical uppercase colons). */
export function generateRandomMac(oui = DEFAULT_MAC_OUI): string {
  const suffix = [randomOctet(), randomOctet(), randomOctet()].join(":");
  return `${oui}:${suffix}`;
}
