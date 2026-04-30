import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createMymindMcpServer } from "./server.js";

/** Starts the MCP server on stdio (used by the `mymind-mcp` bin and `mymind mcp`). */
export async function runMcpStdioServer(): Promise<void> {
  const config = await loadConfig();
  const server = createMymindMcpServer({ config });
  await server.connect(new StdioServerTransport());
}
