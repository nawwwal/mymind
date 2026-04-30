# Client Configs

## Automatic Installer

Install and log in once first:

```sh
npm install -g @nawwal/mymind
mymind login --kid your_key_id --secret your_secret
```

Then run:

```sh
mymind install
```

The installer detects supported local MCP clients and configures whichever ones it finds:

- Claude Code
- Claude Desktop
- Codex
- Cursor

Useful options:

```sh
mymind install --dry-run
mymind install --clients=codex
mymind install --clients=claude-code,codex
mymind install --clients=claude-code --scope=user
```

For non-interactive local setup, pass `--yes`. The generated MCP config runs `mymind mcp` and relies on the saved login, unless you add env values manually.

## Manual Configs

All clients should run the same command:

```sh
mymind mcp
```

If you have run `mymind login`, client configs do not need to contain secrets. The server resolves saved credentials at runtime.

For one-off or ephemeral environments, clients can provide these two environment variables:

| Environment variable | Paste this value |
| --- | --- |
| `MYMIND_KID` | The mymind access-key id / kid. |
| `MYMIND_SECRET` | The matching mymind access-key secret. |

Create or view these values at:

```text
https://access.mymind.com/extensions
```

There is no separate user id field. If a client config asks for environment variables, paste the key id as `MYMIND_KID` and the secret as `MYMIND_SECRET`.

Use user-level MCP config for personal credentials when possible. Project-level MCP config is easier to accidentally commit.

## Claude Desktop

Add the server under `mcpServers` in the Claude Desktop config file.

Common macOS path:

```text
~/Library/Application Support/Claude/claude_desktop_config.json
```

```json
{
  "mcpServers": {
    "mymind": {
      "command": "mymind",
      "args": ["mcp"],
      "env": {}
    }
  }
}
```

If this host cannot access your saved login store, add `MYMIND_KID` and `MYMIND_SECRET` to `env`.

Restart Claude Desktop after saving the file.

## Claude Code

The installer uses the official Claude Code MCP command when `claude` is available:

```sh
claude mcp add mymind \
  --scope user \
  -- mymind mcp
```

Restart Claude Code after adding the server, or run `claude mcp list` to confirm it was added.

## Codex

Add the server to `~/.codex/config.toml`.

```toml
[mcp_servers.mymind]
command = "mymind"
args = ["mcp"]
env = {}
```

If this host cannot access your saved login store, add `MYMIND_KID` and `MYMIND_SECRET` to `env`.

Restart Codex after saving the file.

## Cursor

Add the server to `.cursor/mcp.json` or the Cursor user-level MCP config.

```json
{
  "mcpServers": {
    "mymind": {
      "command": "mymind",
      "args": ["mcp"],
      "env": {}
    }
  }
}
```

If this host cannot access your saved login store, add `MYMIND_KID` and `MYMIND_SECRET` to `env`.

Restart Cursor after saving the file.

## Optional Upload and Download Settings

Skip these on the first install.

Use `MYMIND_ALLOWED_FILE_ROOTS` only if you want upload-capable tools to read local files. Use narrow absolute directories:

```json
"MYMIND_ALLOWED_FILE_ROOTS": "/Users/you/Documents/mymind-uploads"
```

Use `MYMIND_OUTPUT_DIR` only if you want download-capable tools to write files locally:

```json
"MYMIND_OUTPUT_DIR": "/Users/you/Downloads/mymind"
```

For Codex TOML, add optional values into the same `env` inline table:

```toml
env = { MYMIND_OUTPUT_DIR = "/Users/you/Downloads/mymind" }
```

Leave `MYMIND_API_BASE` unset unless you are deliberately testing a trusted alternate API host.

## First Test

After restarting your MCP client, run a narrow read-only request:

```text
Search my mymind for "receipt" and show the top 3 result titles only.
```

The client should show a request to use a `mymind_*` tool. If it does, the server is installed and credentials are being resolved correctly.

## Env-Based Config

Use env-based config when the MCP host cannot read your saved login store or when you are setting up an ephemeral machine:

```json
{
  "mcpServers": {
    "mymind": {
      "command": "mymind",
      "args": ["mcp"],
      "env": {
        "MYMIND_KID": "your_key_id",
        "MYMIND_SECRET": "your_secret"
      }
    }
  }
}
```

For reproducible setups, install a specific global version with `npm install -g @nawwal/mymind@1.0.0`.

## Common Config Mistakes

- Putting `@nawwal/mymind` in `command` instead of the installed binary name `mymind`.
- Forgetting to install globally before adding MCP config.
- Setting only one of the two mymind environment variables when using env-based config.
- Using a mymind account id where `MYMIND_KID` expects the access-key id.
- Pairing a key id with a secret from a different access key.
- Editing a project-level config when the client is reading a user-level config.
- Forgetting to restart the MCP client after config changes.
