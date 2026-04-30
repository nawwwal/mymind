# @nawwal/mymind-mcp

An unofficial, personal-use MCP server for connecting Claude, Codex, Cursor, and other MCP clients to the mymind API.

The package is intended to run locally through `npx`, with mymind credentials supplied as environment variables. It exposes MCP tools around the practical mymind API surface: objects, spaces, tags, entities, conversion, and search. The GitHub repository target is `github.com/nawwwal/mymind-mcp` and may be private even when the npm package is public.

## Installation

Requires Node.js 22 or newer.

You do not need a global install. Configure your MCP client to run:

```sh
npx -y @nawwal/mymind-mcp
```

Required environment variables:

```sh
MYMIND_KID=your_key_id
MYMIND_SECRET=your_secret
```

Optional environment variables:

- `MYMIND_API_BASE`: override the mymind API base URL.
- `MYMIND_USER_AGENT`: override the default user agent.
- `MYMIND_ALLOWED_FILE_ROOTS`: comma-separated allowlist for local file upload roots.
- `MYMIND_OUTPUT_DIR`: directory for downloaded or generated output.

Keep these values out of source control, screenshots, shared logs, and model-visible prompts.

## Client Configs

### Claude Desktop

Add this to your Claude Desktop config file:

```json
{
  "mcpServers": {
    "mymind": {
      "command": "npx",
      "args": ["-y", "@nawwal/mymind-mcp"],
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
args = ["-y", "@nawwal/mymind-mcp"]
env = { MYMIND_KID = "your_key_id", MYMIND_SECRET = "your_secret" }
```

### Cursor

Add this to `.cursor/mcp.json` or your user-level Cursor MCP config:

```json
{
  "mcpServers": {
    "mymind": {
      "command": "npx",
      "args": ["-y", "@nawwal/mymind-mcp"],
      "env": {
        "MYMIND_KID": "your_key_id",
        "MYMIND_SECRET": "your_secret"
      }
    }
  }
}
```

Restart the client after editing its MCP config.

## API Coverage

MCP-covered API areas:

- `authentication`: every API request is signed with the configured mymind access key.
- `rate-limits` and `errors`: rate metadata and problem responses are parsed by the client wrapper.
- `objects`: list, create, fetch, update, delete, restore, pin, unpin, read/replace text content, download inline or to `MYMIND_OUTPUT_DIR`, find related objects, and organize with tags/spaces.
- `spaces`: list, create, fetch, update, delete, and add/remove objects.
- `tags`: list tags and add tags to objects. Standalone tag lookup/editing is not exposed as an MCP tool yet.
- `entities`: fetch an entity by id. The upstream page is treated as WIP/limited.
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

See [docs/api-coverage.md](docs/api-coverage.md) for the complete coverage table.

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
- Confirm the command is `npx` and the args are `["-y", "@nawwal/mymind-mcp"]`.

### Authentication fails

- Confirm both `MYMIND_KID` and `MYMIND_SECRET` are set.
- Check for extra whitespace, quotes copied into the value, or stale credentials.
- Rotate the credentials if there is any chance they leaked.

### `npx` cannot find the package

- Confirm the package name is exactly `@nawwal/mymind-mcp`.
- Confirm your npm registry is `https://registry.npmjs.org/`.
- Try `npm view @nawwal/mymind-mcp` to check registry visibility.

### Tools fail for one content type

- Check whether the content type is listed in [docs/api-coverage.md](docs/api-coverage.md).
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
