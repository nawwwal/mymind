import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const feedback = readFileSync(join(root, ".agents/api-feedback.md"), "utf8");
const offenders = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === ".git" || entry === "node_modules" || entry === "dist") continue;
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) {
      walk(abs);
      continue;
    }
    if (!/\.(ts|js|mjs|md)$/.test(entry)) continue;
    const rel = relative(root, abs).replaceAll("\\", "/");
    const text = readFileSync(abs, "utf8");
    if (/TODO.*(?:api-feedback|api-drift|mymind API drift)/i.test(text)) {
      const key = rel.split("/").pop()?.replace(/\.(ts|js|mjs|md)$/, "") ?? rel;
      if (!feedback.includes(key) && !feedback.includes("API drift")) offenders.push(rel);
    }
  }
}

walk(join(root, "src"));
if (offenders.length > 0) {
  console.error(`API drift TODOs need matching .agents/api-feedback.md entries:\n${offenders.join("\n")}`);
  process.exit(1);
}

