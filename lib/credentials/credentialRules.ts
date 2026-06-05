/** Shared credential rules aligned with billing create paths. */

export type CredentialKind =
  | "endUserName"
  | "endUserLogin"
  | "endUserPassword"
  | "staffDisplayName"
  | "staffUsername"
  | "staffPassword";

export const END_USER_LOGIN_RE = /^[a-z0-9]+$/;
export const STAFF_USERNAME_RE = /^[a-z0-9]{3,50}$/;

const LOWER_ALNUM = "abcdefghijklmnopqrstuvwxyz0123456789";
const LOWER_ALPHA = "abcdefghijklmnopqrstuvwxyz";
const STAFF_ALNUM = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const FIRST_NAMES = [
  "James", "Maria", "John", "Sarah", "Michael", "Emma", "David", "Olivia",
  "Robert", "Sophia", "William", "Isabella", "Richard", "Ava", "Joseph", "Mia",
  "Thomas", "Charlotte", "Daniel", "Amelia", "Matthew", "Harper", "Anthony", "Evelyn",
  "Christopher", "Abigail", "Andrew", "Emily", "Joshua", "Elizabeth", "Ryan", "Sofia",
  "Kevin", "Victoria", "Brian", "Grace", "George", "Chloe", "Edward", "Camila",
  "Nathan", "Lily", "Samuel", "Zoe", "Benjamin", "Hannah", "Alexander", "Natalie",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
  "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
  "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young",
  "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
];

const USERNAME_PREFIXES = [
  "user", "client", "customer", "member", "account", "guest", "viewer",
  "stream", "tvuser", "subscriber", "host", "line", "player", "watch",
];

function randomInt(min: number, max: number) {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function pickFrom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function pickFromAlphabet(alphabet: string, length: number) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function randomLength4to8() {
  return randomInt(4, 8);
}

/** Display name like "Maria Garcia" (first + last). */
export function generateRealisticDisplayName(): string {
  return `${pickFrom(FIRST_NAMES)} ${pickFrom(LAST_NAMES)}`;
}

/**
 * Username like user23sdf, client234wer — word prefix + digits + letter suffix.
 * Length 4–12, lowercase letters and digits only (billing login rules).
 */
export function generateUsernameLike(minLen = 4, maxLen = 12): string {
  const suffixLen = randomInt(2, 3);
  const suffix = pickFromAlphabet(LOWER_ALPHA, suffixLen);

  const maxDigitLen = Math.max(2, Math.min(4, maxLen - suffixLen - 2));
  const digitLen = randomInt(2, maxDigitLen);
  const digits = String(randomInt(10 ** (digitLen - 1), 10 ** digitLen - 1));

  const minPrefixLen = Math.max(2, minLen - digitLen - suffixLen);
  const maxPrefixLen = maxLen - digitLen - suffixLen;
  const viablePrefixes = USERNAME_PREFIXES.filter(
    (p) => p.length >= minPrefixLen && p.length <= maxPrefixLen,
  );
  const fallbackPrefixes = USERNAME_PREFIXES.filter((p) => p.length + digitLen + suffixLen <= maxLen);
  const prefix = pickFrom(viablePrefixes.length > 0 ? viablePrefixes : fallbackPrefixes);

  let value = (prefix + digits + suffix).toLowerCase();
  if (value.length < minLen) {
    value += pickFromAlphabet(LOWER_ALPHA, minLen - value.length);
  }
  return value.slice(0, maxLen);
}

export function generateCredentialValue(kind: CredentialKind): string {
  switch (kind) {
    case "endUserLogin":
      return generateUsernameLike(4, 12);
    case "endUserPassword": {
      const len = randomLength4to8();
      return pickFromAlphabet(LOWER_ALNUM, Math.max(4, len));
    }
    case "endUserName":
    case "staffDisplayName":
      return generateRealisticDisplayName();
    case "staffUsername":
      return generateUsernameLike(3, 12);
    case "staffPassword": {
      const len = randomLength4to8();
      return pickFromAlphabet(STAFF_ALNUM, Math.max(3, len));
    }
    default:
      return pickFromAlphabet(LOWER_ALNUM, randomLength4to8());
  }
}

export function validateCredentialFormat(
  kind: CredentialKind,
  raw: string,
): { ok: true } | { ok: false; message: string } {
  const value = raw.trim();
  switch (kind) {
    case "endUserLogin": {
      const login = value.toLowerCase();
      if (!login || !END_USER_LOGIN_RE.test(login)) {
        return { ok: false, message: "Use lowercase letters and digits only." };
      }
      return { ok: true };
    }
    case "endUserPassword": {
      if (value.length < 4 || value.length > 100) {
        return { ok: false, message: "Password must be 4–100 characters." };
      }
      return { ok: true };
    }
    case "endUserName":
    case "staffDisplayName":
      if (!value) return { ok: false, message: "Name is required." };
      return { ok: true };
    case "staffUsername": {
      const u = value.toLowerCase();
      if (!STAFF_USERNAME_RE.test(u)) {
        return { ok: false, message: "Username must be 3–50 letters or numbers." };
      }
      return { ok: true };
    }
    case "staffPassword": {
      if (value.length < 3 || value.length > 50) {
        return { ok: false, message: "Password must be 3–50 characters." };
      }
      return { ok: true };
    }
    default:
      return { ok: true };
  }
}

export function credentialKindChecksAvailability(kind: CredentialKind): boolean {
  return kind === "endUserLogin" || kind === "staffUsername";
}
