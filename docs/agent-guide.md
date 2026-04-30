# Agent guide

## Choosing MCP vs CLI

- **MCP** (`mymind mcp`): Best inside Cursor, Claude Desktop, Codex, or any MCP host. Tools return JSON (`CallToolResult`); use `dryRun` and explicit confirm flags for writes and high-cost reads per tool schema.
- **CLI** (`mymind …`): Best for scripts, CI, and quick inspection. Uses the same credentials and API client; output is controlled via `MYMIND_OUTPUT` / flags.

## Credentials (resolution order)

1. `MYMIND_KID` + `MYMIND_SECRET` in the environment  
2. `~/.config/mymind/credentials.json` (or `XDG_CONFIG_HOME`)  
3. macOS Keychain item (`com.nawwal.mymind` / `credentials`), JSON body `{ kid, secret }`

Use `mymind auth status` or `mymind whoami` to see what is active without printing secrets.

## Safety defaults

- Destructive or costly operations require explicit CLI flags (`--yes-cost`, `--yes-delete`, etc.) or `MYMIND_AUTO_CONFIRM=1`.
- MCP mirrors this with literals like `confirmDelete`, `confirmHighCost`, `dryRun`.
- File reads/uploads are constrained by `MYMIND_ALLOWED_FILE_ROOTS`; downloads go through `MYMIND_OUTPUT_DIR` when saving to disk.

## Coverage

Endpoint and behavior inventory: [coverage.md](./coverage.md). Project agent index: [AGENTS.md](../AGENTS.md) and [.agents/AGENTS.md](../.agents/AGENTS.md).
