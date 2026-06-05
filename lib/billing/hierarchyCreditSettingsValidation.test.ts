import { describe, expect, it } from "vitest";
import {
  HIERARCHY_GLOBAL_ADD_CREDIT_MAX,
  validateBillingCreditLimitsValues,
} from "./hierarchyCreditSettingsValidation";

describe("validateBillingCreditLimitsValues", () => {
  it("accepts global max at the ceiling", () => {
    expect(
      validateBillingCreditLimitsValues(
        HIERARCHY_GLOBAL_ADD_CREDIT_MAX,
        1,
        1,
        1,
      ),
    ).toBe(true);
  });

  it("rejects global max above 1,000,000", () => {
    expect(
      validateBillingCreditLimitsValues(
        HIERARCHY_GLOBAL_ADD_CREDIT_MAX + 6,
        1,
        1,
        1,
      ),
    ).toBe(false);
  });

  it("rejects minimums above global max", () => {
    expect(validateBillingCreditLimitsValues(100_000, 100_001, 1, 1)).toBe(false);
  });
});
