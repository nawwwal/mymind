import { describe, expect, it } from "vitest";
import { dryRunResult, jsonContent } from "../../src/actions/mcp-result.js";

describe("MCP result helpers", () => {
  it("adds structured content for object JSON", () => {
    expect(jsonContent({ ok: true })).toMatchObject({ structuredContent: { ok: true } });
  });

  it("builds dry-run previews", () => {
    expect(dryRunResult("x", { id: "1" })).toMatchObject({
      structuredContent: { dryRun: true, action: "x", preview: { id: "1" } }
    });
  });
});

