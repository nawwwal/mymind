#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

console.warn(
  "[@nawwal/mymind-mcp] This package is deprecated. Install `@nawwal/mymind` instead " +
    "(https://www.npmjs.com/package/@nawwal/mymind). Forwarding to the new `mymind-mcp` binary.\n"
);

let entry;
try {
  entry = require.resolve("@nawwal/mymind/dist/mcp.js");
} catch {
  console.error(
    "Could not resolve `@nawwal/mymind`. Install dependencies: npm install @nawwal/mymind"
  );
  process.exit(1);
}

const result = spawnSync(process.execPath, [entry, ...process.argv.slice(2)], {
  stdio: "inherit"
});

process.exit(result.status ?? 1);
