/** Minimal manifest for agents; extend as verbs stabilize. */
export const CLI_MANIFEST = {
  v: 1,
  schemaVersion: 1,
  name: "mymind",
  description: "CLI for the unofficial mymind API bridge",
  commands: [
    { path: ["search"], summary: "Search mymind", tier: "read" },
    { path: ["ls"], summary: "List objects (shortcut)", tier: "read" },
    { path: ["get"], summary: "Get object (shortcut)", tier: "read" },
    { path: ["save"], summary: "Create object from URL", tier: "write", needsConfirmCost: true },
    { path: ["note"], summary: "Create note from stdin", tier: "write", needsConfirmCost: true },
    { path: ["capture"], summary: "Upload file", tier: "write", needsConfirmCost: true },
    { path: ["objects", "ls"], summary: "List objects", tier: "read" },
    { path: ["objects", "get"], summary: "Get object", tier: "read" },
    { path: ["spaces", "ls"], summary: "List spaces", tier: "read" },
    { path: ["tags", "ls"], summary: "List tags", tier: "read" },
    { path: ["convert"], summary: "Convert content", tier: "read" },
    { path: ["login"], summary: "Save credentials", tier: "auth" },
    { path: ["logout"], summary: "Remove saved credentials", tier: "auth" },
    { path: ["whoami"], summary: "Show active kid / source", tier: "read" },
    { path: ["install"], summary: "Configure MCP clients", tier: "setup" },
    { path: ["mcp"], summary: "Start MCP stdio server", tier: "setup" }
  ]
} as const;
