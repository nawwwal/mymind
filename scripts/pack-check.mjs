#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const cacheDir = mkdtempSync(join(tmpdir(), "mymind-npm-cache-"));

try {
  const result = spawnSync("npm", ["--cache", cacheDir, "pack", "--dry-run"], {
    stdio: "inherit"
  });
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(cacheDir, { recursive: true, force: true });
}
