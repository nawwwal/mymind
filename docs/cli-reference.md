# CLI reference

Package binary: `mymind` (`npx @nawwal/mymind …`). Machine-readable command index: `mymind manifest` or [manifest.json](./manifest.json).

## Output

- Default on TTY: human-ish JSON payload only (`--text`).
- Non-TTY default: full envelope JSON (`MYMIND_OUTPUT` unset).
- Flags: `--json`, `--ndjson`, `--text`.
- Env: `MYMIND_OUTPUT=json|ndjson|text`.

Envelope shape: `{ v, kind, data, rateLimit, warnings }`.

## Top-level commands

| Command | Purpose |
|--------|---------|
| `search` | Query API search (`--syntax` prints DSL help). High-cost flags need `--yes-cost` or `MYMIND_AUTO_CONFIRM=1`. |
| `ls` | Shortcut for `objects ls`. |
| `get` | Shortcut for `objects get`. |
| `save` | Create from URL (`--yes-cost`). |
| `note` | Create markdown note from stdin (`--yes-cost`). |
| `capture` | Upload local file (`--yes-cost`). |
| `convert` | MIME conversion (`--from` / `--to`). |
| `objects` | Object subtree (`ls`, `get`, `create`, `update`, `rm`, `restore`, `pin`, `unpin`, `download`, `content`, `replace`, `related`, `tag`, `link-spaces`, `thumbnail`, `search`). |
| `spaces` | Spaces subtree (`ls`, `get`, `create`, `update`, `rm`, `add`, `remove`). |
| `tags` | `tags ls`. |
| `login` | Save credentials: `--store file` (default) or `--store keychain` (macOS). |
| `logout` | Remove credential file and macOS keychain entry when present. |
| `auth status` | Print which layers exist (`env`, `file`, `keychain`) and effective source. |
| `whoami` | Resolved `kid` plus `source` and `layers`. |
| `install` | MCP client installer. |
| `mcp` | Stdio MCP server. |
| `manifest` | Print CLI manifest JSON (`--schemaVersion` for schema id only). |

## stdin conventions

Several commands accept IDs on stdin (one per line) when the positional id is omitted—see command `--help` via `mymind <cmd> --help` where citty exposes it.

See also: [exit-codes](./exit-codes.md), [error-codes](./error-codes.md).
