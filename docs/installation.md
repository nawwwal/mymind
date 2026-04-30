# Installation

`@nawwal/mymind-mcp` is published as a public npm package and is normally run directly through `npx`.

The short version:

1. Create a mymind API access key.
2. Copy its key id into `MYMIND_KID`.
3. Copy its secret into `MYMIND_SECRET`.
4. Run the automatic installer, or paste both values into your MCP client's `env` block manually.
5. Restart the MCP client.

You do not need a separate mymind user id or account id for this server. `MYMIND_KID` means "key id", not "user id".

## Requirements

- Node.js 22 or newer.
- An MCP client such as Claude Desktop, Codex, or Cursor.
- mymind API credentials:
  - `MYMIND_KID`
  - `MYMIND_SECRET`

## Get Credentials

Create or view your mymind API access key at:

```text
https://access.mymind.com/extensions
```

The access key has two parts:

| Value in mymind | Put it in this env var | What it is |
| --- | --- | --- |
| Key id / kid | `MYMIND_KID` | Public identifier for the access key. |
| Secret | `MYMIND_SECRET` | Private signing secret for that key. |

Treat `MYMIND_SECRET` like a password. Do not put it in committed files, screenshots, shared logs, or chat messages.

## How Secrets Are Used

The MCP client starts this package as a local child process. The `env` block in the client config becomes environment variables for that local process only.

At runtime:

1. Your MCP client launches `npx -y @nawwal/mymind-mcp`.
2. The client passes `MYMIND_KID` and `MYMIND_SECRET` to that process.
3. The server signs mymind API requests locally with those values.
4. The values are not stored by this package and are not sent to the MCP host as tool results.

The credentials still give the local server access to the mymind account represented by the key, so only configure them in MCP clients you trust.

## Automatic Installer

Run the installer through `npx`:

```sh
npx -y @nawwal/mymind-mcp install
```

The installer detects supported local MCP clients and configures each one it finds:

- Claude Code, when the `claude` CLI is on `PATH`.
- Claude Desktop, when the standard config directory exists.
- Codex, when the `codex` CLI or `~/.codex` config directory exists.
- Cursor, when the `cursor` CLI or `~/.cursor` config directory exists.

Set credentials before running:

```sh
MYMIND_KID=your_key_id MYMIND_SECRET=your_secret npx -y @nawwal/mymind-mcp install
```

If you do not set credentials first, the installer prompts for them. The secret prompt is hidden in interactive terminals.

Preview detected targets without writing:

```sh
npx -y @nawwal/mymind-mcp install --dry-run
```

Install for one or more specific clients:

```sh
npx -y @nawwal/mymind-mcp install --clients=codex
npx -y @nawwal/mymind-mcp install --clients=claude-code,codex,cursor
```

For Claude Code, the installer uses user scope by default. You can choose another Claude Code scope:

```sh
npx -y @nawwal/mymind-mcp install --clients=claude-code --scope=local
```

For non-interactive shells, set both credentials and pass `--yes`:

```sh
MYMIND_KID=your_key_id MYMIND_SECRET=your_secret npx -y @nawwal/mymind-mcp install --yes
```

## Manual npx Command

If you prefer to configure a client by hand, the server command is:

```sh
npx -y @nawwal/mymind-mcp
```

For a one-off local shell test:

```sh
MYMIND_KID=your_key_id MYMIND_SECRET=your_secret npx -y @nawwal/mymind-mcp
```

For day-to-day use, configure the environment variables inside your MCP client config instead of exporting them globally.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `MYMIND_KID` | Yes | The mymind access-key id from the extensions page. |
| `MYMIND_SECRET` | Yes | The matching mymind access-key secret. |
| `MYMIND_API_BASE` | No | Overrides the mymind API base URL. Most users should leave this unset. |
| `MYMIND_USER_AGENT` | No | Overrides the default package user agent. |
| `MYMIND_ALLOWED_FILE_ROOTS` | No | Comma-separated list of local directories that upload-capable tools are allowed to read from. Leave unset unless you need uploads. |
| `MYMIND_OUTPUT_DIR` | No | Directory for downloaded or generated output. Leave unset unless you need tools to write files locally. |

## Recommended Setup

1. Run `npx -y @nawwal/mymind-mcp install`, or add the MCP server to your client config manually.
2. Put the mymind access-key id in `MYMIND_KID`.
3. Put the matching mymind access-key secret in `MYMIND_SECRET`.
4. Leave optional variables unset for the first run.
5. Restart the client.
6. Confirm the `mymind` server appears in the client MCP tools list.
7. Run a read-only search or lookup first before allowing write actions.

For copy-pasteable Claude Desktop, Codex, and Cursor examples, see [client-configs.md](client-configs.md).

## First Read-Only Test

After restart, ask your MCP client for a narrow read-only action, for example:

```text
Search my mymind for "receipt" and show the top 3 result titles only.
```

If the server is configured correctly, the client should ask to use a `mymind_*` tool and return results from your account. Start with read-only calls before creating, deleting, tagging, moving, or downloading anything.

## Common Setup Problems

- `MYMIND_KID` is the key id from mymind, not your mymind account id.
- `MYMIND_SECRET` must be the matching secret for that same key id.
- Do not include extra spaces around copied values.
- In JSON config files, keep values as strings inside quotes.
- In TOML config files, keep values as strings inside quotes.
- Restart the MCP client after every config change.
- If `npx` hangs, confirm the args include `-y`.
- If authentication fails, rotate the key in mymind and update both values together.

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
