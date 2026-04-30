import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assertAllowedPath, assertOutputPath } from "../../src/actions/paths.js";

describe("action path guards", () => {
  it("rejects uploads outside allowed roots", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mymind-paths-"));
    try {
      const allowed = join(dir, "allowed");
      const outside = join(dir, "outside");
      await mkdir(allowed);
      await mkdir(outside);
      const secret = join(outside, "secret.txt");
      const link = join(allowed, "link.txt");
      await writeFile(secret, "x");
      await symlink(secret, link);
      await expect(assertAllowedPath(link, [allowed])).rejects.toThrow("outside");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("requires output filename, not path", async () => {
    await expect(assertOutputPath("/tmp", "../x", { createDirectory: false })).rejects.toThrow("filename");
  });
});

