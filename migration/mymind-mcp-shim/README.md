# `@nawwal/mymind-mcp` (shim)

This package exists only for backwards compatibility. New installs should use **`@nawwal/mymind`**, which ships both the `mymind` CLI and the `mymind-mcp` stdio server.

- Install: `npm install -g @nawwal/mymind` or use `npx -y @nawwal/mymind …`
- MCP entry: `mymind-mcp` (from `@nawwal/mymind`) or `npx -y @nawwal/mymind mcp`

This shim prints a one-line deprecation warning and executes the real binary from `@nawwal/mymind`.
