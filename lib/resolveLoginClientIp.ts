import { getClientIpFromHeaders, parsePublicIpCandidate } from "@/lib/requestClientIp";

/**
 * Best-effort public IP for staff login:
 * 1) Proxy / middleware headers on the server request
 * 2) Hidden field from browser (`resolveClientPublicIpAction` or ipify fallback)
 */
export function resolveLoginClientIp(input: {
  headers: Headers;
  formPublicIp?: string | null;
}): string | null {
  return getClientIpFromHeaders(input.headers) ?? parsePublicIpCandidate(input.formPublicIp);
}
