import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { MymindMcpConfig } from "./config.js";
import { MyMindClient } from "./mymind/index.js";
import { registerMymindPrompts } from "./prompts/index.js";
import { registerMymindResources } from "./resources/index.js";
import { registerMymindTools } from "./tools/index.js";

export interface ServerDependencies {
  config: MymindMcpConfig;
}

export function createMymindMcpServer({ config }: ServerDependencies): McpServer {
  const server = new McpServer({
    name: "@nawwal/mymind-mcp",
    version: "0.1.0"
  }, {
    instructions:
      "Use this server to search, read, create, and organize the authenticated user's mymind account. " +
      "Prefer read-only tools first. Write, destructive, high-cost, upload, and download-to-disk tools require explicit host approval and confirmation fields."
  });

  const client = new MyMindClient({
    kid: config.kid,
    secret: config.secret,
    apiBaseUrl: config.apiBaseUrl,
    userAgent: config.userAgent
  });

  registerMymindTools(server, { client, config });
  registerMymindResources(server, { client });
  registerMymindPrompts(server);

  return server;
}
