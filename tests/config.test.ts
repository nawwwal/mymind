import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("requires MyMind credentials", async () => {
    await expect(loadConfig({})).rejects.toThrow(/Missing MyMind credentials/);
  });

  it("loads defaults and optional path settings", async () => {
    const config = await loadConfig({
      MYMIND_KID: "kid",
      MYMIND_SECRET: "secret",
      MYMIND_ALLOWED_FILE_ROOTS: "/tmp,/Users/example",
      MYMIND_OUTPUT_DIR: "/tmp/out"
    });

    expect(config).toMatchObject({
      kid: "kid",
      secret: "secret",
      apiBaseUrl: "https://api.mymind.com",
      userAgent: "@nawwal/mymind/1.0.2",
      allowedFileRoots: ["/tmp", "/Users/example"],
      outputDir: "/tmp/out"
    });
  });
});
