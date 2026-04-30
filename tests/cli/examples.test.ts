import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("docs examples", () => {
  it("declare expected envelope kinds", () => {
    for (const file of ["search.json", "objects.ls.json"]) {
      const example = JSON.parse(readFileSync(join(process.cwd(), "docs/examples", file), "utf8")) as {
        expectedExitCode: number;
        expectedEnvelopeKind: string;
      };
      expect(example.expectedExitCode).toBe(0);
      expect(example.expectedEnvelopeKind).toBeTruthy();
    }
  });
});

