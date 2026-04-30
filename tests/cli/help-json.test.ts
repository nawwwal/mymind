import { describe, expect, it, vi } from "vitest";
import { runCli } from "../../src/cli-app/root.js";

describe("CLI JSON help", () => {
  it("prints manifest entry for a command", async () => {
    const out = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    await runCli(["node", "mymind", "search", "--help", "--json"]);
    const text = out.mock.calls.map((call) => String(call[0])).join("");
    expect(JSON.parse(text)).toMatchObject({ path: ["search"] });
    out.mockRestore();
  });
});

