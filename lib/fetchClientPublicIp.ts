import { resolveClientPublicIpAction } from "@/actions/clientData";

/**
 * Resolve the visitor's public IP in the browser (for login).
 * Tries same-origin server action first, then external echo services.
 */
export async function fetchClientPublicIpForLogin(): Promise<string> {
  try {
    const data = await resolveClientPublicIpAction();
    if (data.ip) return data.ip;
  } catch {
    /* same-origin unavailable */
  }

  try {
    const res = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { ip?: string };
      if (data.ip) return data.ip.trim();
    }
  } catch {
    /* ipify unavailable */
  }

  try {
    const res = await fetch("https://ipv4.icanhazip.com", { cache: "no-store" });
    if (res.ok) {
      const text = (await res.text()).trim();
      if (text) return text;
    }
  } catch {
    /* icanhazip unavailable */
  }

  return "";
}
