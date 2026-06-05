import { NextResponse } from "next/server";
import { redactDevClientPayload, stripClientPayload } from "@/lib/dto/redact";
import { encryptApiPayload, isApiTransportEncryptionEnabled } from "@/lib/dto/transportCrypto";

type JsonInit = ResponseInit & { devRedact?: boolean };

/** JSON API response; strips credential fields always; masks phone in development. */
export function apiJson<T>(data: T, init?: JsonInit) {
  const { devRedact = true, ...responseInit } = init ?? {};
  const stripped = stripClientPayload(data);
  const body = devRedact ? redactDevClientPayload(stripped) : stripped;
  const output = isApiTransportEncryptionEnabled() ? encryptApiPayload(body) : body;
  return NextResponse.json(output, responseInit);
}
