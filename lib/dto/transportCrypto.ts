import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type EncryptedApiEnvelope = {
  encrypted: true;
  alg: "aes-256-gcm";
  iv: string;
  tag: string;
  data: string;
};

function keyFromSecret(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function mustGetTransportSecret(): string {
  const raw = (process.env.BILLING_API_ENCRYPTION_SECRET ?? "").trim();
  if (!raw) {
    throw new Error("BILLING_API_ENCRYPTION_SECRET is required when BILLING_API_ENCRYPT=1");
  }
  return raw;
}

export function isApiTransportEncryptionEnabled(): boolean {
  return process.env.BILLING_API_ENCRYPT === "1";
}

export function encryptApiPayload<T>(payload: T): EncryptedApiEnvelope {
  const secret = mustGetTransportSecret();
  const key = keyFromSecret(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: true,
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  };
}

export function decryptApiPayload<T>(envelope: EncryptedApiEnvelope): T {
  const secret = mustGetTransportSecret();
  const key = keyFromSecret(secret);
  const iv = Buffer.from(envelope.iv, "base64");
  const tag = Buffer.from(envelope.tag, "base64");
  const ciphertext = Buffer.from(envelope.data, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  return JSON.parse(plaintext) as T;
}
