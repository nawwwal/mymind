import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
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

  it("does not promote npx in user-facing docs or source help", () => {
    let output = "";
    try {
      output = execFileSync(
        "rg",
        ["-n", "npx -y @nawwal/mymind|npx …", "README.md", "docs", "AGENTS.md", ".agents", "src"],
        { cwd: process.cwd(), encoding: "utf8" }
      );
    } catch {
      output = "";
    }
    expect(output).toBe("");
  });
});
