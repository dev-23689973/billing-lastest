/** Keys never sent across the client boundary (production + development). */
export const CLIENT_OMIT_KEYS = ["password", "parentPin", "parent_pin"] as const;

const CLIENT_OMIT_KEY_SET = new Set<string>(CLIENT_OMIT_KEYS);

const DEV_MASK_KEYS = new Set<string>([...CLIENT_OMIT_KEYS, "phone"]);

export function maskDevSensitiveValue(key: string, value: unknown): unknown {
  if (process.env.NODE_ENV !== "development") return value;
  if (!DEV_MASK_KEYS.has(key)) return value;
  if (value == null || value === "") return value;
  if (typeof value === "string") return "••••••";
  return value;
}

/** Deep-clone JSON-like data; omits credential fields always; masks phone in development. */
export function stripClientPayload<T>(data: T): T {
  return stripClientPayloadInner(data) as T;
}

function stripClientPayloadInner(value: unknown): unknown {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stripClientPayloadInner);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (CLIENT_OMIT_KEY_SET.has(k)) continue;
    out[k] =
      typeof v === "object" && v !== null
        ? stripClientPayloadInner(v)
        : process.env.NODE_ENV === "development"
          ? maskDevSensitiveValue(k, v)
          : v;
  }
  return out;
}

/** Deep-clone JSON-like data; masks selected fields in development only. */
export function redactDevClientPayload<T>(data: T): T {
  if (process.env.NODE_ENV !== "development") return data;
  return redactDevClientPayloadInner(data) as T;
}

function redactDevClientPayloadInner(value: unknown): unknown {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redactDevClientPayloadInner);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = typeof v === "object" && v !== null ? redactDevClientPayloadInner(v) : maskDevSensitiveValue(k, v);
  }
  return out;
}
