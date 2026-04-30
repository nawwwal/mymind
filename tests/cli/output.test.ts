import { afterEach, describe, expect, it } from "vitest";
import { outputMode } from "../../src/cli-app/io.js";

describe("outputMode", () => {
  const savedArgv = [...process.argv];
  const savedOutput = process.env.MYMIND_OUTPUT;

  afterEach(() => {
    process.argv = [...savedArgv];
    if (savedOutput === undefined) {
      delete process.env.MYMIND_OUTPUT;
    } else {
      process.env.MYMIND_OUTPUT = savedOutput;
    }
  });

  it("honors MYMIND_OUTPUT", () => {
    process.argv = ["node", "mymind", "search"];
    process.env.MYMIND_OUTPUT = "ndjson";
    expect(outputMode()).toBe("ndjson");
  });

  it("prefers --json over MYMIND_OUTPUT", () => {
    process.argv = ["node", "mymind", "--json", "whoami"];
    process.env.MYMIND_OUTPUT = "text";
    expect(outputMode()).toBe("json");
  });
});
