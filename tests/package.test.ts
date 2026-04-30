import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

interface PackageJson {
  name: string;
  repository?: {
    type?: string;
    url?: string;
  };
  files?: string[];
  engines?: {
    node?: string;
  };
  publishConfig?: {
    access?: string;
  };
}

async function readPackageJson(): Promise<PackageJson> {
  return JSON.parse(await readFile("package.json", "utf8")) as PackageJson;
}

describe("package metadata", () => {
  it("targets the private GitHub repository while publishing a public npm package", async () => {
    const packageJson = await readPackageJson();

    expect(packageJson.name).toBe("@nawwal/mymind");
    expect(packageJson.repository).toEqual({
      type: "git",
      url: "git+https://github.com/nawwwal/mymind-mcp.git"
    });
    expect(packageJson.publishConfig?.access).toBe("public");
  });

  it("documents the Node support policy and ships linked docs", async () => {
    const packageJson = await readPackageJson();

    expect(packageJson.engines?.node).toBe(">=22");
    expect(packageJson.files).toEqual(expect.arrayContaining(["dist", "docs", "README.md", "LICENSE"]));
  });

  it("keeps README local links resolvable", async () => {
    const readme = await readFile("README.md", "utf8");
    const links = [...readme.matchAll(/\]\((docs\/[^)]+\.md)\)/g)].map((match) => match[1]);

    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      await expect(stat(link as string)).resolves.toBeDefined();
    }
  });

  it("includes docs in the npm package contents", () => {
    const cacheDir = mkdtempSync(join(tmpdir(), "mymind-mcp-npm-cache-"));

    try {
      const output = execFileSync("npm", ["--cache", cacheDir, "pack", "--dry-run", "--json"], {
        encoding: "utf8"
      });
      const [pack] = JSON.parse(output) as Array<{ files: Array<{ path: string }> }>;
      if (pack === undefined) {
        throw new Error("npm pack did not return package metadata.");
      }
      const packedPaths = pack.files.map((file) => file.path);

      expect(packedPaths).toEqual(
        expect.arrayContaining([
          "README.md",
          "LICENSE",
          "docs/api-coverage.md",
          "docs/client-configs.md",
          "docs/development.md",
          "docs/installation.md",
          "docs/safety.md"
        ])
      );
    } finally {
      rmSync(cacheDir, { recursive: true, force: true });
    }
  });
});
