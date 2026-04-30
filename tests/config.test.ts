import { describe, expect, it } from "vitest";
import { DEFAULT_JWT_VALIDITY_SECONDS, jwtValiditySecondsFromEnv, loadConfig } from "../src/config.js";

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
      outputDir: "/tmp/out",
      jwtValiditySeconds: DEFAULT_JWT_VALIDITY_SECONDS
    });
  });
});

describe("jwtValiditySecondsFromEnv", () => {
  it("defaults to 24h and clamps", () => {
    expect(jwtValiditySecondsFromEnv({})).toBe(86_400);
    expect(jwtValiditySecondsFromEnv({ MYMIND_JWT_VALIDITY_SECONDS: "3600" })).toBe(3600);
    expect(jwtValiditySecondsFromEnv({ MYMIND_JWT_VALIDITY_SECONDS: "30" })).toBe(60);
    expect(jwtValiditySecondsFromEnv({ MYMIND_JWT_VALIDITY_SECONDS: "9999999" })).toBe(604_800);
    expect(jwtValiditySecondsFromEnv({ MYMIND_JWT_VALIDITY_SECONDS: "nope" })).toBe(86_400);
  });
});
