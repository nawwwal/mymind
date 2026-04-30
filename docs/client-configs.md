# Client Configs

## Automatic Installer

Run:

```sh
npx -y @nawwal/mymind-mcp install
```

The installer detects supported local MCP clients and configures whichever ones it finds:

- Claude Code
- Claude Desktop
- Codex
- Cursor

Set credentials before running, or enter them when prompted:

```sh
MYMIND_KID=your_key_id MYMIND_SECRET=your_secret npx -y @nawwal/mymind-mcp install
```

Useful options:

```sh
npx -y @nawwal/mymind-mcp install --dry-run
npx -y @nawwal/mymind-mcp install --clients=codex
npx -y @nawwal/mymind-mcp install --clients=claude-code,codex
npx -y @nawwal/mymind-mcp install --clients=claude-code --scope=user
```

For non-interactive shells, set both credentials and pass `--yes`.

## Manual Configs

All clients should run the same command:

```sh
npx -y @nawwal/mymind-mcp
```

All clients must provide the same two environment variables:

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

Replace `your_key_id` and `your_secret` with the real values from mymind. Keep the surrounding JSON quotes.

Restart Claude Desktop after saving the file.

## Claude Code

The installer uses the official Claude Code MCP command when `claude` is available:

```sh
claude mcp add mymind \
  --scope user \
  --env MYMIND_KID=your_key_id \
  --env MYMIND_SECRET=your_secret \
  -- npx -y @nawwal/mymind-mcp
```

Restart Claude Code after adding the server, or run `claude mcp list` to confirm it was added.

## Codex

Add the server to `~/.codex/config.toml`.

```toml
[mcp_servers.mymind]
command = "npx"
args = ["-y", "@nawwal/mymind-mcp"]
env = { MYMIND_KID = "your_key_id", MYMIND_SECRET = "your_secret" }
```

Replace `your_key_id` and `your_secret` with the real values from mymind. Keep the surrounding TOML quotes.

Restart Codex after saving the file.

## Cursor

Add the server to `.cursor/mcp.json` or the Cursor user-level MCP config.

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

Replace `your_key_id` and `your_secret` with the real values from mymind. Keep the surrounding JSON quotes.

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
env = { MYMIND_KID = "your_key_id", MYMIND_SECRET = "your_secret", MYMIND_OUTPUT_DIR = "/Users/you/Downloads/mymind" }
```

Leave `MYMIND_API_BASE` unset unless you are deliberately testing a trusted alternate API host.

## First Test

After restarting your MCP client, run a narrow read-only request:

```text
Search my mymind for "receipt" and show the top 3 result titles only.
```

The client should show a request to use a `mymind_*` tool. If it does, the server is installed and the credentials are being passed correctly.

## Version Pinning

For reproducible setups, pin a specific package version:

```json
{
  "mcpServers": {
    "mymind": {
      "command": "npx",
      "args": ["-y", "@nawwal/mymind-mcp@1.0.0"],
      "env": {
        "MYMIND_KID": "your_key_id",
        "MYMIND_SECRET": "your_secret"
      }
    }
  }
}
```

Use `@latest` when you explicitly want the latest release.

## Common Config Mistakes

- Putting the package name in `command` instead of `args`.
- Omitting `-y`, which can cause `npx` to wait for interactive confirmation.
- Setting only one of the two required mymind environment variables.
- Using a mymind account id where `MYMIND_KID` expects the access-key id.
- Pairing a key id with a secret from a different access key.
- Editing a project-level config when the client is reading a user-level config.
- Forgetting to restart the MCP client after config changes.
