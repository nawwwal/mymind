# Migrating from `@nawwal/mymind-mcp`

The unified package is **`@nawwal/mymind@1.x`**:

- **CLI:** `mymind` (or `npx -y @nawwal/mymind <command>`)
- **MCP stdio:** run `npx -y @nawwal/mymind mcp` or the `mymind-mcp` binary from the same package

Update MCP client configs from:

```json
"args": ["-y", "@nawwal/mymind-mcp"]
```

to:

```json
"args": ["-y", "@nawwal/mymind", "mcp"]
```

Optional compatibility: install **`@nawwal/mymind-mcp@0.2.x`** (shim in `migration/mymind-mcp-shim/`), which prints a deprecation warning and forwards to the new binary.

Programmatic imports were rarely used; prefer `import { createMymindMcpServer, loadConfig, runCli } from "@nawwal/mymind"`.
