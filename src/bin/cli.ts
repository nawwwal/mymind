#!/usr/bin/env node
import { runCli } from "../cli-app/root.js";

runCli(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`mymind failed: ${message}\n`);
  process.exitCode = 1;
});
