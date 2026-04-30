#!/usr/bin/env node
import { runMcpStdioServer } from "../mcp-stdio.js";

runMcpStdioServer().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`mymind-mcp failed: ${message}\n`);
  process.exitCode = 1;
});
