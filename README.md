# @nawwal/mymind

Unofficial **CLI + MCP** bridge for the mymind API: use `mymind` from any terminal or CI, and `mymind-mcp` (stdio) from MCP hosts such as Claude Desktop, Codex, or Cursor.

The package is intended to run through `npx` without a global install. Credentials resolve from environment variables, `mymind login` (default: `~/.config/mymind/credentials.json`), and on macOS optionally `mymind login --store keychain`. It exposes the practical API surface: objects, spaces, tags, conversion, and search—not every undocumented endpoint variant.

Repository: `github.com/nawwwal/mymind-mcp` (may stay private while the npm package is public).

## Installation

Requires Node.js 22 or newer.

You do not need a global install.

## CLI quick start

```sh
npx -y @nawwal/mymind search 'tag:reading' --json
npx -y @nawwal/mymind objects ls --since 7d --limit 50
```

Credential file (after `mymind login`) works for both CLI and MCP. Agents: see [AGENTS.md](./AGENTS.md). Introspection: `npx -y @nawwal/mymind manifest`.

### Automatic Installer

The easiest path is the installer:

```sh
npx -y @nawwal/mymind install
```

It detects supported local MCP clients and configures whichever ones it finds:

- Claude Code
- Claude Desktop
- Codex
- Cursor

Set credentials before running, or enter them when prompted:

```sh
MYMIND_KID=your_key_id MYMIND_SECRET=your_secret npx -y @nawwal/mymind install
```

To target one client explicitly:

```sh
npx -y @nawwal/mymind install --clients=codex
```

Use `--dry-run` to see what would be configured without writing files.

### Manual Command

Your MCP client should run:

```sh
npx -y @nawwal/mymind mcp
```

Create or view a mymind access key at:

```text
https://access.mymind.com/extensions
```

Then put the two access-key values into your MCP client config:

| Environment variable | Paste this value |
| --- | --- |
| `MYMIND_KID` | The mymind access-key id / kid. This is not a user id. |
| `MYMIND_SECRET` | The matching mymind access-key secret. Treat it like a password. |

Optional environment variables:

- `MYMIND_API_BASE`: override the mymind API base URL.
- `MYMIND_USER_AGENT`: override the default user agent.
- `MYMIND_ALLOWED_FILE_ROOTS`: comma-separated allowlist for local file upload roots.
- `MYMIND_OUTPUT_DIR`: directory for downloaded or generated output.

Keep these values out of source control, screenshots, shared logs, and model-visible prompts.

The secrets are not typed into chat. They live in the MCP client's local config, and the client passes them to the local `mymind-mcp` process as environment variables when it starts the server.

See [docs/installation.md](docs/installation.md) for the full setup walkthrough.

## Client Configs

The installer writes these configs for you when possible:

```sh
npx -y @nawwal/mymind install
```

Manual examples are below.

### Claude Desktop

Add this to your Claude Desktop config file:

```json
{
  "mcpServers": {
    "mymind": {
      "command": "npx",
      "args": ["-y", "@nawwal/mymind", "mcp"],
      "env": {
        "MYMIND_KID": "your_key_id",
        "MYMIND_SECRET": "your_secret"
      }
    }
  }
}
```

### Codex

Add this to `~/.codex/config.toml`:

```toml
[mcp_servers.mymind]
command = "npx"
args = ["-y", "@nawwal/mymind", "mcp"]
env = { MYMIND_KID = "your_key_id", MYMIND_SECRET = "your_secret" }
```

### Cursor

Add this to `.cursor/mcp.json` or your user-level Cursor MCP config:

```json
{
  "mcpServers": {
    "mymind": {
      "command": "npx",
      "args": ["-y", "@nawwal/mymind", "mcp"],
      "env": {
        "MYMIND_KID": "your_key_id",
        "MYMIND_SECRET": "your_secret"
      }
    }
  }
}
```

Restart the client after editing its MCP config.

After restart, test with a narrow read-only request first:

```text
Search my mymind for "receipt" and show the top 3 result titles only.
```

If your client asks to run a `mymind_*` tool, the server is installed and credentials are being passed correctly.

## Coverage

MCP- and CLI-covered API areas:

- `authentication`: every API request is signed with the configured mymind access key.
- `rate-limits` and `errors`: rate metadata and problem responses are parsed by the client wrapper.
- `objects`: list, create, fetch, update, delete, restore, pin, unpin, read/replace text content, download inline or to `MYMIND_OUTPUT_DIR`, find related objects, and organize with tags/spaces.
- `spaces`: list, create, fetch, update, delete, and add/remove objects.
- `tags`: list tags and add tags to objects. Standalone tag lookup/editing is not exposed as tools yet.
- `entities`: not exposed (removed from MCP/CLI; upstream spec dropped entities).
- `convert`: convert among `text/plain`, `text/markdown`, and `application/prose+json`.
- `search`: search the authenticated mymind account, including optional semantic/rerank flags when explicitly confirmed.

Reference-only API documentation:

- `api`
- `access-control`
- `types`
- `clients`
- `supported-formats`
- `markdown-support`
- `prose`

See [docs/coverage.md](docs/coverage.md) for the complete coverage table and [docs/migration.md](docs/migration.md) if you are moving off the old package name.

## Safety Notes

- This is an unofficial integration and is not endorsed by mymind.
- This server runs with access to the authenticated mymind account represented by `MYMIND_KID` and `MYMIND_SECRET`.
- Treat every write-capable tool as operating on real user data.
- Do not paste secrets into chat. Put them in the MCP client environment config or your local shell environment.
- Review tool calls before allowing actions that create, update, delete, tag, move, or otherwise reorganize content.
- Search and retrieval may expose private saved material to the active MCP client conversation.
- Confirmation fields reduce accidental writes, but the MCP host still controls whether a human sees and approves tool calls.
- Leave `MYMIND_API_BASE` unset unless you are deliberately testing a trusted API host.
- Rotate credentials if they are accidentally committed, logged, or shared.

See [docs/safety.md](docs/safety.md) for more detail.

## Troubleshooting

### The client does not show the mymind server

- Restart the MCP client after changing config.
- Confirm the config file path is the one your client actually reads.
- Confirm the command is `npx` and the args are `["-y", "@nawwal/mymind", "mcp"]`.

### Authentication fails

- Confirm both `MYMIND_KID` and `MYMIND_SECRET` are set.
- Check for extra whitespace, quotes copied into the value, or stale credentials.
- Rotate the credentials if there is any chance they leaked.

### `npx` cannot find the package

- Confirm the package name is exactly `@nawwal/mymind`.
- Confirm your npm registry is `https://registry.npmjs.org/`.
- Try `npm view @nawwal/mymind` to check registry visibility.

### Tools fail for one content type

- Check whether the content type is listed in [docs/coverage.md](docs/coverage.md).
- Some mymind documentation pages are reference-only for this server and do not imply an MCP tool exists.

## Development

```sh
npm install
npm run build
npm test
```

See [docs/development.md](docs/development.md) for local development and release notes.

## License

MIT
