import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const allowedPrefixes = ["migration/", ".cursor/", "node_modules/", "dist/"];
const allowedFiles = new Set([
  "package-lock.json",
  "docs/migration.md",
  ".env.example",
  ".agents/architecture.md",
  ".agents/product.md",
  ".agents/safety-release.md",
  "scripts/lint-renames.mjs"
]);
const needles = ["@nawwal/mymind-mcp"];
const offenders = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === ".git") continue;
    const abs = join(dir, entry);
    const rel = relative(root, abs).replaceAll("\\", "/");
    if (allowedPrefixes.some((prefix) => rel.startsWith(prefix))) continue;
    if (statSync(abs).isDirectory()) {
      walk(abs);
    } else {
      if (allowedFiles.has(rel)) continue;
      const text = readFileSync(abs, "utf8");
      if (needles.some((needle) => text.includes(needle))) offenders.push(rel);
    }
  }
}

walk(root);
if (offenders.length > 0) {
  console.error(`Unexpected legacy package references:\n${offenders.join("\n")}`);
  process.exit(1);
}

