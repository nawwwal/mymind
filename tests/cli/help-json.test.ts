import { afterEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../../src/cli-app/root.js";
import { Exit } from "../../src/actions/errors.js";

describe("CLI JSON help", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints manifest entry for a command", async () => {
    const out = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    await runCli(["node", "mymind", "search", "--help", "--json"]);
    const text = out.mock.calls.map((call) => String(call[0])).join("");
    expect(JSON.parse(text)).toMatchObject({ path: ["search"] });
  });

  it("supports mymind help", async () => {
    const out = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    await runCli(["node", "mymind", "help"]);
    const text = out.mock.calls.map((call) => String(call[0])).join("");
    expect(text).toContain("Examples");
    expect(text).toContain("mymind search --tag reading");
  });

  it("supports mymind help search", async () => {
    const out = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    await runCli(["node", "mymind", "help", "search"]);
    const text = out.mock.calls.map((call) => String(call[0])).join("");
    expect(text.indexOf("Examples")).toBeLessThan(text.indexOf("Friendly filters"));
    expect(text).toContain("mymind search \"weekly review\" --type note");
  });

  it("suggests search by tag for tag-like mistakes", async () => {
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    vi.spyOn(process, "exit").mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`exit:${code ?? ""}`);
    });

    expect(() => runCli(["node", "mymind", "tags", "reading"])).toThrow(`exit:${Exit.USAGE}`);
    const text = vi.mocked(process.stderr.write).mock.calls.map((call) => String(call[0])).join("");
    expect(text).toContain("Did you mean: mymind search --tag reading?");
  });
});
