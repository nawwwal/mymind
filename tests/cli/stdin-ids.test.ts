import { describe, expect, it } from "vitest";
import { readStdinLines } from "../../src/cli-app/stdin.js";

describe("stdin ids helper", () => {
  it("is exported as a function for pipeline composition", () => {
    expect(typeof readStdinLines).toBe("function");
  });
});

