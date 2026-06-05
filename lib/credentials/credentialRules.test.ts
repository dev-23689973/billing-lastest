import { describe, expect, it } from "vitest";
import {
  END_USER_LOGIN_RE,
  STAFF_USERNAME_RE,
  generateCredentialValue,
  generateRealisticDisplayName,
  generateUsernameLike,
  validateCredentialFormat,
} from "@/lib/credentials/credentialRules";

describe("credentialRules", () => {
  it("generates realistic display names", () => {
    for (let i = 0; i < 20; i++) {
      const v = generateRealisticDisplayName();
      expect(v).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
    }
    expect(generateCredentialValue("endUserName")).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  });

  it("generates username-like logins (4–12 chars)", () => {
    for (let i = 0; i < 30; i++) {
      const v = generateUsernameLike(4, 12);
      expect(v.length).toBeGreaterThanOrEqual(4);
      expect(v.length).toBeLessThanOrEqual(12);
      expect(END_USER_LOGIN_RE.test(v)).toBe(true);
      expect(v).toMatch(/^[a-z]+\d+[a-z]+$/);
    }
    const login = generateCredentialValue("endUserLogin");
    expect(login.length).toBeGreaterThanOrEqual(4);
    expect(login.length).toBeLessThanOrEqual(12);
    expect(END_USER_LOGIN_RE.test(login)).toBe(true);
  });

  it("generates valid staff username", () => {
    const v = generateCredentialValue("staffUsername");
    expect(v.length).toBeGreaterThanOrEqual(3);
    expect(v.length).toBeLessThanOrEqual(12);
    expect(STAFF_USERNAME_RE.test(v)).toBe(true);
  });

  it("validates end-user password length", () => {
    expect(validateCredentialFormat("endUserPassword", "abc").ok).toBe(false);
    expect(validateCredentialFormat("endUserPassword", "abcd").ok).toBe(true);
  });
});
