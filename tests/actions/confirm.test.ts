import { describe, expect, it } from "vitest";
import { requireHighCostSearchConfirm, requireLiteralConfirm } from "../../src/actions/confirm.js";

describe("action confirmation helpers", () => {
  it("requires literal true", () => {
    expect(() => requireLiteralConfirm(undefined, "nope")).toThrow("nope");
    expect(() => requireLiteralConfirm(true, "nope")).not.toThrow();
  });

  it("requires high cost confirmation for semantic search", () => {
    expect(() => requireHighCostSearchConfirm(undefined, true, undefined)).toThrow("confirmHighCost");
    expect(() => requireHighCostSearchConfirm(true, true, undefined)).not.toThrow();
  });
});

