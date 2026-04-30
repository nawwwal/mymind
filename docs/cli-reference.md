# CLI reference

Generated from `src/cli-app/manifest-data.ts`. Regenerate with `npm run cli-reference`.

## Commands

| Command | Tier | Summary | Output schema |
| --- | --- | --- | --- |
| `search` | `read` | Search mymind | `docs/output-schemas/envelope.schema.json` |
| `ls` | `read` | List objects (shortcut) | `docs/output-schemas/envelope.schema.json` |
| `get` | `read` | Get object (shortcut) | `docs/output-schemas/envelope.schema.json` |
| `save` | `write` | Create object from URL | `docs/output-schemas/envelope.schema.json` |
| `note` | `write` | Create note from stdin | `docs/output-schemas/envelope.schema.json` |
| `capture` | `write` | Upload file | `docs/output-schemas/envelope.schema.json` |
| `objects ls` | `read` | List objects | `docs/output-schemas/envelope.schema.json` |
| `objects get` | `read` | Get object | `docs/output-schemas/envelope.schema.json` |
| `objects create` | `write` | Create object (url, body, file) | `docs/output-schemas/envelope.schema.json` |
| `objects update` | `write` | Update object metadata | `docs/output-schemas/envelope.schema.json` |
| `objects rm` | `write` | Soft-delete objects | `docs/output-schemas/envelope.schema.json` |
| `objects restore` | `write` | Restore soft-deleted objects | `docs/output-schemas/envelope.schema.json` |
| `objects pin` | `write` | Pin objects | `docs/output-schemas/envelope.schema.json` |
| `objects unpin` | `write` | Unpin objects | `docs/output-schemas/envelope.schema.json` |
| `objects download` | `read` | Download object blob | `docs/output-schemas/envelope.schema.json` |
| `objects content` | `read` | Fetch object content | `docs/output-schemas/envelope.schema.json` |
| `objects replace` | `write` | Replace note content | `docs/output-schemas/envelope.schema.json` |
| `objects related` | `read` | Related objects (high cost) | `docs/output-schemas/envelope.schema.json` |
| `objects tag` | `write` | Add tags to objects | `docs/output-schemas/envelope.schema.json` |
| `objects link-spaces` | `write` | Add objects to spaces | `docs/output-schemas/envelope.schema.json` |
| `objects thumbnail` | `read` | Fetch thumbnail | `docs/output-schemas/envelope.schema.json` |
| `objects search` | `read` | Search under objects namespace | `docs/output-schemas/envelope.schema.json` |
| `spaces ls` | `read` | List spaces | `docs/output-schemas/envelope.schema.json` |
| `spaces get` | `read` | Get space | `docs/output-schemas/envelope.schema.json` |
| `spaces create` | `write` | Create space | `docs/output-schemas/envelope.schema.json` |
| `spaces update` | `write` | Update space | `docs/output-schemas/envelope.schema.json` |
| `spaces rm` | `write` | Delete space shell | `docs/output-schemas/envelope.schema.json` |
| `spaces add` | `write` | Add object to space | `docs/output-schemas/envelope.schema.json` |
| `spaces remove` | `write` | Remove object from space | `docs/output-schemas/envelope.schema.json` |
| `tags ls` | `read` | List tags | `docs/output-schemas/envelope.schema.json` |
| `convert` | `read` | Convert content | `docs/output-schemas/envelope.schema.json` |
| `login` | `auth` | Save credentials (file or macOS keychain) | `docs/output-schemas/envelope.schema.json` |
| `logout` | `auth` | Remove saved credentials (file + keychain) | `docs/output-schemas/envelope.schema.json` |
| `auth status` | `auth` | Credential layers (env / file / keychain) | `docs/output-schemas/envelope.schema.json` |
| `whoami` | `read` | Show active kid / resolution source | `docs/output-schemas/envelope.schema.json` |
| `install` | `setup` | Configure MCP clients | `docs/output-schemas/envelope.schema.json` |
| `mcp` | `setup` | Start MCP stdio server | `docs/output-schemas/envelope.schema.json` |
| `manifest` | `setup` | Print machine-readable CLI manifest | `docs/output-schemas/envelope.schema.json` |

## Environment

- `MYMIND_KID`: Access key id
- `MYMIND_SECRET`: Access key secret (base64)
- `MYMIND_API_BASE`: API base URL (default https://api.mymind.com)
- `MYMIND_USER_AGENT`: Override User-Agent for API requests
- `MYMIND_ALLOWED_FILE_ROOTS`: Comma-separated roots allowed for uploads (MCP/CLI)
- `MYMIND_OUTPUT_DIR`: Directory for MCP download writes
- `MYMIND_JWT_VALIDITY_SECONDS`: Per-request JWT exp−iat window (60–604800s, default 86400); each HTTP call mints a new token
- `MYMIND_OUTPUT`: CLI output shape: json | ndjson | text
- `MYMIND_AUTO_CONFIRM`: Set to "1" to skip interactive cost confirmations in CLI
- `XDG_CONFIG_HOME`: Overrides config dir for ~/.config/mymind/credentials.json

## Error Codes

- `AUTH_INVALID` (exit 3): Run `mymind login` or set MYMIND_KID and MYMIND_SECRET.
- `NOT_FOUND` (exit 4): Check the id and try again.
- `RATE_LIMITED` (exit 5): Wait for the retry window or reduce high-cost calls.
- `UPSTREAM_ERROR` (exit 64): The mymind API returned an unexpected error.
- `GENERIC_ERROR` (exit 1): Run with --verbose for more context.
