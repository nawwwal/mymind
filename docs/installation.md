# Installation

`@nawwal/mymind` is published as a public npm package. The intended setup is to install the CLI once, log in once, and then reuse the `mymind` binary for normal CLI and MCP use.

The short version:

1. Create a mymind API access key.
2. Install the package globally with `npm install -g @nawwal/mymind`.
3. Run `mymind login --kid ... --secret ...` once to save credentials.
4. Run `mymind install`, or add `mymind mcp` to your MCP client config manually.
5. Restart the MCP client.

You do not need a separate mymind user id or account id for this server. `MYMIND_KID` means "key id", not "user id".

## Requirements

- Node.js 22 or newer.
- An MCP client such as Claude Desktop, Codex, or Cursor.
- mymind API credentials for the first login:
  - key id / `kid`
  - secret

## Get Credentials

Create or view your mymind API access key at:

```text
https://access.mymind.com/extensions
```

The access key has two parts:

| Value in mymind | Use it as | What it is |
| --- | --- | --- |
| Key id / kid | `mymind login --kid ...` or `MYMIND_KID` | Public identifier for the access key. |
| Secret | `mymind login --secret ...` or `MYMIND_SECRET` | Private signing secret for that key. |

Treat `MYMIND_SECRET` like a password. Do not put it in committed files, screenshots, shared logs, or chat messages.

## Install And Log In Once

Install the CLI globally:

```sh
npm install -g @nawwal/mymind
```

Then save credentials locally:

```sh
mymind login --kid your_key_id --secret your_secret
```

By default, credentials are stored in `~/.config/mymind/credentials.json` with restrictive file permissions. On macOS, you can store them in Keychain instead:

```sh
mymind login --kid your_key_id --secret your_secret --store keychain
```

Confirm the saved login:

```sh
mymind auth status --json
```

## How Secrets Are Used

The MCP client starts the installed `mymind` binary as a local child process.

At runtime:

1. Your MCP client launches `mymind mcp`.
2. The server resolves credentials from `MYMIND_KID` / `MYMIND_SECRET`, `~/.config/mymind/credentials.json`, or macOS Keychain.
3. The server signs mymind API requests locally with those values.
4. Secrets are never returned to the MCP host as tool results.

The credentials still give the local server access to the mymind account represented by the key, so only configure them in MCP clients you trust.

## Automatic Installer

Run the installer after `mymind login`:

```sh
mymind install
```

The installer detects supported local MCP clients and configures each one it finds:

- Claude Code, when the `claude` CLI is on `PATH`.
- Claude Desktop, when the standard config directory exists.
- Codex, when the `codex` CLI or `~/.codex` config directory exists.
- Cursor, when the `cursor` CLI or `~/.cursor` config directory exists.

The installer writes MCP configs that run `mymind mcp`. It does not need to copy secrets into every client config when you have already logged in.

Preview detected targets without writing:

```sh
mymind install --dry-run
```

Install for one or more specific clients:

```sh
mymind install --clients=codex
mymind install --clients=claude-code,codex,cursor
```

For Claude Code, the installer uses user scope by default. You can choose another Claude Code scope:

```sh
mymind install --clients=claude-code --scope=local
```

For non-interactive local setup, pass `--yes`:

```sh
mymind install --yes
```

## Manual MCP Command

If you prefer to configure a client by hand, the server command is:

```sh
mymind mcp
```

For a one-off local shell test without saved credentials:

```sh
MYMIND_KID=your_key_id MYMIND_SECRET=your_secret mymind mcp
```

For day-to-day use, prefer `mymind login` over copying credentials into every MCP client config.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `MYMIND_KID` | No, if logged in | The mymind access-key id from the extensions page. |
| `MYMIND_SECRET` | No, if logged in | The matching mymind access-key secret. |
| `MYMIND_API_BASE` | No | Overrides the mymind API base URL. Most users should leave this unset. |
| `MYMIND_USER_AGENT` | No | Overrides the default package user agent. |
| `MYMIND_ALLOWED_FILE_ROOTS` | No | Comma-separated list of local directories that upload-capable tools are allowed to read from. Leave unset unless you need uploads. |
| `MYMIND_OUTPUT_DIR` | No | Directory for downloaded or generated output. Leave unset unless you need tools to write files locally. |

## Recommended Setup

1. Run `npm install -g @nawwal/mymind`.
2. Run `mymind login --kid your_key_id --secret your_secret`.
3. Run `mymind install`, or add `mymind mcp` to your client config manually.
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
- If you choose env-based config, keep JSON/TOML values as quoted strings.
- Restart the MCP client after every config change.
- If `mymind` is not found, confirm your npm global bin directory is on `PATH`.
- If authentication fails, rotate the key in mymind and update both values together.

## Updating

Update the globally installed CLI when you want a new release:

```sh
npm install -g @nawwal/mymind@latest
```

## Package Visibility

The npm package is public:

```sh
npm view @nawwal/mymind
```

The GitHub repository may be private. That does not prevent publishing a public npm package, but it does affect npm provenance generation. See [development.md](development.md).
