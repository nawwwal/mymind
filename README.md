# mymind CLI

Remember everything.
Use it anywhere.

`mymind` brings your saved notes, bookmarks, articles, images, documents, and references to your terminal and your AI tools.

Save things. Find them later. Let your agents search your mind without making you copy paste context.

## Install

The easiest way:

```bash
curl -fsSL https://raw.githubusercontent.com/nawwwal/mymind/main/install.sh | sh
```

This installs both:

- `mymind` - the command line app
- `mymind-mcp` - the MCP server for agents

It can also set up MCP for the tools it finds on your machine.

## Connect your mind

Create a mymind access key, then run:

```bash
mymind auth set-key YOUR_KID YOUR_BASE64_SECRET
mymind doctor
```

That is it.

## Install with Homebrew

```bash
brew install nawwwal/whimsies/mymind
```

Update later with:

```bash
brew upgrade nawwwal/whimsies/mymind
```

## Use with agents

Let the installer find your agent apps:

```bash
curl -fsSL https://raw.githubusercontent.com/nawwwal/mymind/main/install.sh | MYMIND_SETUP_MCP=all sh
```

Or choose one:

```bash
curl -fsSL https://raw.githubusercontent.com/nawwwal/mymind/main/install.sh | MYMIND_SETUP_MCP=codex sh
curl -fsSL https://raw.githubusercontent.com/nawwwal/mymind/main/install.sh | MYMIND_SETUP_MCP=claude-code sh
curl -fsSL https://raw.githubusercontent.com/nawwwal/mymind/main/install.sh | MYMIND_SETUP_MCP=cursor sh
```

For scripts and agent-led installs:

```bash
curl -fsSL https://raw.githubusercontent.com/nawwwal/mymind/main/install.sh | \
  MYMIND_KID=YOUR_KID \
  MYMIND_SECRET=YOUR_BASE64_SECRET \
  MYMIND_SETUP_MCP=codex,claude-code,cursor \
  sh
```

## Use with Claude Desktop

Download the `.mcpb` for your computer from the [latest release](https://github.com/nawwwal/mymind/releases/latest).

Double-click it.

Claude Desktop will ask for:

- `MYMIND_KID`
- `MYMIND_SECRET`

MCPB bundles are published for macOS and Windows.

## Use with Claude Code

For the focused skill:

```bash
npx skills add nawwwal/mymind -g
```

Then use:

```text
/mymind what you want to find
```

For MCP instead:

```bash
curl -fsSL https://raw.githubusercontent.com/nawwwal/mymind/main/install.sh | MYMIND_SETUP_MCP=claude-code sh
```

## Use with Codex

```bash
curl -fsSL https://raw.githubusercontent.com/nawwwal/mymind/main/install.sh | MYMIND_SETUP_MCP=codex sh
```

Then run `/mcp` in Codex and check that `mymind` is active.

The main tool is `search`.

## Use with Cursor

```bash
curl -fsSL https://raw.githubusercontent.com/nawwwal/mymind/main/install.sh | MYMIND_SETUP_MCP=cursor sh
```

## What you can do

### Find anything

```bash
mymind search "reading list"
mymind search "article about memory" --semantic --rerank
mymind search "design notes" --json
```

### Save a link

```bash
mymind objects create \
  --url "https://example.com/article" \
  --tags "reading,research"
```

### Save a note

```bash
mymind objects create \
  --content "Follow up on the search UX." \
  --title "Search UX note" \
  --tags "notes,work"
```

### See what you saved

```bash
mymind objects list --limit 20
mymind objects get <object_id>
mymind objects content get-object <content_object_id>
```

### Keep a local copy

```bash
mymind sync --since 30d
mymind search "design notes" --data-source local
```

### Organize when you want to

You do not need folders to find things.

But if you want structure:

```bash
mymind tags
mymind objects tags add-object <object_id> --tags "reading,research"

mymind spaces create --name "Research"
mymind spaces objects add-to-space <space_id> <object_id>
```

## For agents and scripts

Use `--agent` when another tool is calling `mymind`.

```bash
mymind search "renewal notes" --agent
mymind objects list --agent --select id,title,url
```

Useful flags:

- `--json` gives structured output
- `--select id,title,url` keeps only the fields you need
- `--dry-run` shows what would happen
- `--deliver file:results.json` writes output to a file

Find the right command:

```bash
mymind which "search objects"
mymind --help
mymind <command> --help
```

## Other install options

### Pre-built binaries

Download `mymind` and `mymind-mcp` from the [latest release](https://github.com/nawwwal/mymind/releases/latest).

On macOS:

```bash
xattr -d com.apple.quarantine mymind mymind-mcp 2>/dev/null || true
chmod +x mymind mymind-mcp
sudo mv mymind mymind-mcp /usr/local/bin/
```

On Linux:

```bash
chmod +x mymind mymind-mcp
sudo mv mymind mymind-mcp /usr/local/bin/
```

On Windows, unzip the archive and add the folder to your `Path`.

### Go developers

Only use this if you already have Go installed:

```bash
go install github.com/nawwwal/mymind/cmd/mymind@latest
go install github.com/nawwwal/mymind/cmd/mymind-mcp@latest
```

### From source

```bash
make build-all
```

<!-- pp-hermes-install-anchor -->
## Install for Hermes

From the Hermes CLI:

```bash
hermes skills install nawwwal/mymind --force
```

Inside a Hermes chat:

```bash
/skills install nawwwal/mymind --force
```

## Install for OpenClaw

Tell your OpenClaw agent:

```text
Install the mymind skill from https://github.com/nawwwal/mymind.
```

## Configuration

Config lives at:

```text
~/.config/mymind/config.toml
```

You can also use environment variables:

```bash
export MYMIND_KID="your-kid"
export MYMIND_SECRET="your-base64-secret"
```

## Troubleshooting

Check the connection:

```bash
mymind doctor
```

If auth fails, set the key again:

```bash
mymind auth set-key YOUR_KID YOUR_BASE64_SECRET
```

If a command feels unclear:

```bash
mymind which "what you want to do"
mymind <command> --help
```
