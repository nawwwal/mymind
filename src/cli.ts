#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { getInstallHelp, InstallHelp, runInstallCommand } from "./install.js";
import { createMymindMcpServer } from "./server.js";

const HELP = `mymind-mcp

Unofficial personal-use MCP server for the mymind API.

Usage:
  mymind-mcp
  mymind-mcp install [options]

Required environment:
  MYMIND_KID       Access-key identifier from https://access.mymind.com/extensions
  MYMIND_SECRET    Base64 access-key secret from https://access.mymind.com/extensions

Optional environment:
  MYMIND_API_BASE             Defaults to https://api.mymind.com
  MYMIND_USER_AGENT           Defaults to @nawwal/mymind-mcp/0.1.0
  MYMIND_ALLOWED_FILE_ROOTS   Comma-separated upload allowlist
  MYMIND_OUTPUT_DIR           Download output directory

Installer:
${getInstallHelp()}
`;

async function main(): Promise<void> {
  const arg = process.argv[2];

  if (arg === "--help" || arg === "-h") {
    process.stdout.write(HELP);
    return;
  }

  if (arg === "--version" || arg === "-v") {
    process.stdout.write("0.1.0\n");
    return;
  }

  if (arg === "install") {
    await runInstallCommand(process.argv.slice(3));
    return;
  }

  const config = loadConfig();
  const server = createMymindMcpServer({ config });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  if (error instanceof InstallHelp) {
    process.stdout.write(error.message);
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`mymind-mcp failed: ${message}\n`);
  process.exitCode = 1;
});
