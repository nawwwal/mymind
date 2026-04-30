import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const shimPath = join(dirname(fileURLToPath(import.meta.url)), "../../migration/mymind-mcp-shim/shim.mjs");

describe("mymind-mcp shim package", () => {
  it("references the new package and forwards to dist/mcp.js", () => {
    const src = readFileSync(shimPath, "utf8");
    expect(src).toContain("@nawwal/mymind");
    expect(src).toContain("dist/mcp.js");
    expect(src).toContain("deprecated");
  });
});
