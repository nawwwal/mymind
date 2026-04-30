# Client Configs

All clients should run the same command:

```sh
npx -y @nawwal/mymind-mcp
```

All clients must provide:

- `MYMIND_KID`
- `MYMIND_SECRET`

## Claude Desktop

Add the server under `mcpServers` in the Claude Desktop config file.

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

Restart Claude Desktop after saving the file.

## Codex

Add the server to `~/.codex/config.toml`.

```toml
[mcp_servers.mymind]
command = "npx"
args = ["-y", "@nawwal/mymind-mcp"]
env = { MYMIND_KID = "your_key_id", MYMIND_SECRET = "your_secret" }
```

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

Restart Cursor after saving the file.

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
- Editing a project-level config when the client is reading a user-level config.
- Forgetting to restart the MCP client after config changes.
