# Installation

`@nawwal/mymind-mcp` is published as a public npm package and is normally run directly through `npx`.

## Requirements

- Node.js 22 or newer.
- An MCP client such as Claude Desktop, Codex, or Cursor.
- mymind API credentials:
  - `MYMIND_KID`
  - `MYMIND_SECRET`

## Run with npx

Use the package without a global install:

```sh
npx -y @nawwal/mymind-mcp
```

For a one-off local shell test:

```sh
MYMIND_KID=your_key_id MYMIND_SECRET=your_secret npx -y @nawwal/mymind-mcp
```

For day-to-day use, configure the environment variables inside your MCP client config instead of exporting them globally.

## Environment Variables

Required:

### `MYMIND_KID`

The mymind key id used for API authentication.

### `MYMIND_SECRET`

The mymind secret used with `MYMIND_KID`.

Optional:

### `MYMIND_API_BASE`

Overrides the mymind API base URL. Most users should leave this unset.

### `MYMIND_USER_AGENT`

Overrides the default package user agent.

### `MYMIND_ALLOWED_FILE_ROOTS`

Comma-separated list of local directories that upload-capable tools are allowed to read from.

### `MYMIND_OUTPUT_DIR`

Directory for downloaded or generated output.

## Recommended Setup

1. Add the MCP server to your client config.
2. Put `MYMIND_KID` and `MYMIND_SECRET` in the config environment block.
3. Restart the client.
4. Confirm the `mymind` server appears in the client MCP tools list.
5. Run a read-only search or lookup first before allowing write actions.

## Updating

Because the server is launched with `npx -y @nawwal/mymind-mcp`, clients normally resolve the latest published package. If your environment caches packages aggressively, clear the npm cache or pin a version explicitly:

```sh
npx -y @nawwal/mymind-mcp@latest
```

## Package Visibility

The npm package is public:

```sh
npm view @nawwal/mymind-mcp
```

The GitHub repository may be private. That does not prevent publishing a public npm package, but it does affect npm provenance generation. See [development.md](development.md).
