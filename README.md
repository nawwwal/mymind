# Mymind CLI

The mymind API uses signed per-request JWT bearer tokens. Objects are saved URLs,
notes, images, documents, videos, or files. Objects can have tags, spaces, notes,
content, blobs, screenshots, and AI-generated metadata.

## Install

### Install Script

Install both `mymind` and `mymind-mcp`:

```bash
curl -fsSL https://raw.githubusercontent.com/nawwwal/mymind/main/install.sh | sh
```

The installer detects supported MCP clients and lets you choose where to configure mymind. For human credential entry, use the interactive installer instead of putting secrets in shell history.

Interactive install with all detected MCP clients:

```bash
curl -fsSL https://raw.githubusercontent.com/nawwwal/mymind/main/install.sh | MYMIND_SETUP_MCP=all sh
```

Non-interactive:

```bash
curl -fsSL https://raw.githubusercontent.com/nawwwal/mymind/main/install.sh | \
  MYMIND_KID=YOUR_KID \
  MYMIND_SECRET=YOUR_SECRET \
  MYMIND_SETUP_MCP=codex,claude-code,cursor \
  sh
```

### Homebrew

Install both `mymind` and `mymind-mcp` with:

```bash
brew tap nawwwal/whimsies
brew install mymind
```

### Go developers only

Install directly from the source repo if you already have Go:

```bash
go install github.com/nawwwal/mymind/cmd/mymind@latest
go install github.com/nawwwal/mymind/cmd/mymind-mcp@latest
```

Most users do not need Go. Homebrew and the pre-built release archives install both `mymind` and `mymind-mcp`.

### From Source

```bash
make build-all
```

## Update

Homebrew install:

```bash
brew upgrade mymind
```

Install-script install:

```bash
curl -fsSL https://raw.githubusercontent.com/nawwwal/mymind/main/install.sh | sh
```

### Pre-built binary

Download and install both `mymind` and `mymind-mcp` from the [latest release](https://github.com/nawwwal/mymind/releases/latest).

macOS Apple Silicon:

```bash
VERSION="$(curl -fsSLI -o /dev/null -w '%{url_effective}' https://github.com/nawwwal/mymind/releases/latest | sed 's#.*/tag/##')"
ASSET_VERSION="${VERSION#v}"
ASSET="mymind_${ASSET_VERSION}_macos_apple_silicon.tar.gz"
curl -fLO "https://github.com/nawwwal/mymind/releases/download/${VERSION}/${ASSET}"
curl -fLO "https://github.com/nawwwal/mymind/releases/download/${VERSION}/checksums.txt"
grep " ${ASSET}$" checksums.txt | shasum -a 256 --check
tar -xzf "${ASSET}"
xattr -d com.apple.quarantine mymind mymind-mcp 2>/dev/null || true
chmod +x mymind mymind-mcp
sudo mv mymind mymind-mcp /usr/local/bin/
mymind version
```

macOS Intel:

```bash
VERSION="$(curl -fsSLI -o /dev/null -w '%{url_effective}' https://github.com/nawwwal/mymind/releases/latest | sed 's#.*/tag/##')"
ASSET_VERSION="${VERSION#v}"
ASSET="mymind_${ASSET_VERSION}_macos_intel.tar.gz"
curl -fLO "https://github.com/nawwwal/mymind/releases/download/${VERSION}/${ASSET}"
curl -fLO "https://github.com/nawwwal/mymind/releases/download/${VERSION}/checksums.txt"
grep " ${ASSET}$" checksums.txt | shasum -a 256 --check
tar -xzf "${ASSET}"
xattr -d com.apple.quarantine mymind mymind-mcp 2>/dev/null || true
chmod +x mymind mymind-mcp
sudo mv mymind mymind-mcp /usr/local/bin/
mymind version
```

Linux x86_64:

```bash
VERSION="$(curl -fsSLI -o /dev/null -w '%{url_effective}' https://github.com/nawwwal/mymind/releases/latest | sed 's#.*/tag/##')"
ASSET_VERSION="${VERSION#v}"
ASSET="mymind_${ASSET_VERSION}_linux_x64.tar.gz"
curl -fLO "https://github.com/nawwwal/mymind/releases/download/${VERSION}/${ASSET}"
curl -fLO "https://github.com/nawwwal/mymind/releases/download/${VERSION}/checksums.txt"
grep " ${ASSET}$" checksums.txt | sha256sum --check
tar -xzf "${ASSET}"
chmod +x mymind mymind-mcp
sudo mv mymind mymind-mcp /usr/local/bin/
mymind version
```

Linux ARM64:

```bash
VERSION="$(curl -fsSLI -o /dev/null -w '%{url_effective}' https://github.com/nawwwal/mymind/releases/latest | sed 's#.*/tag/##')"
ASSET_VERSION="${VERSION#v}"
ASSET="mymind_${ASSET_VERSION}_linux_arm64.tar.gz"
curl -fLO "https://github.com/nawwwal/mymind/releases/download/${VERSION}/${ASSET}"
curl -fLO "https://github.com/nawwwal/mymind/releases/download/${VERSION}/checksums.txt"
grep " ${ASSET}$" checksums.txt | sha256sum --check
tar -xzf "${ASSET}"
chmod +x mymind mymind-mcp
sudo mv mymind mymind-mcp /usr/local/bin/
mymind version
```

Windows PowerShell:

```powershell
$release = Invoke-RestMethod https://api.github.com/repos/nawwwal/mymind/releases/latest
$version = $release.tag_name
$assetVersion = $version -replace '^v', ''
$asset = "mymind_${assetVersion}_windows_x64.zip"
Invoke-WebRequest "https://github.com/nawwwal/mymind/releases/download/$version/$asset" -OutFile $asset
Invoke-WebRequest "https://github.com/nawwwal/mymind/releases/download/$version/checksums.txt" -OutFile checksums.txt
$expected = ((Select-String -Path checksums.txt -Pattern " $asset$").Line -split ' ')[0].ToUpper()
$actual = (Get-FileHash $asset -Algorithm SHA256).Hash
if ($actual -ne $expected) { throw "checksum mismatch for $asset" }
Expand-Archive $asset -DestinationPath "$HOME\bin\mymind" -Force
$env:Path = "$HOME\bin\mymind;$env:Path"
mymind.exe version
```

Windows ARM64 archives are also published in the latest release as `mymind_<version>_windows_arm64.zip`.

<!-- pp-hermes-install-anchor -->
## Install for Hermes

From the Hermes CLI:

```bash
hermes skills install nawwwal/mymind --force
```

Inside a Hermes chat session:

```bash
/skills install nawwwal/mymind --force
```

## Install for OpenClaw

Tell your OpenClaw agent (copy this):

```
Install the mymind skill from https://github.com/nawwwal/mymind. The skill defines how its required CLI can be installed.
```

## Quick Start

### 1. Install

See [Install](#install) above.

### 2. Set Up Credentials

Create a mymind access key, then store it:

```bash
mymind auth set-key YOUR_KID YOUR_BASE64_SECRET
```

Or set it via environment variable:

```bash
export MYMIND_KID="your-kid"
export MYMIND_SECRET="your-base64-secret"
```

### 3. Verify Setup

```bash
mymind doctor
```

This checks your configuration and credentials.

### 4. Try Your First Command

```bash
mymind objects list
```

## Usage

Run `mymind --help` for the full command reference and flag list.

## Command Guide

Use `mymind <command> --help` for the exact flags on any command. The examples below cover the common workflows.

### Find Things

Search normally:

```bash
mymind search "reading list"
mymind search "articles about memory" --limit 20
```

Use the live API only when you want API-backed semantic search or related-object ranking:

```bash
mymind search "articles about memory" --data-source live --semantic --rerank --json
mymind search "similar notes" --data-source live --similar-to <object_id> --json
```

Use local search after syncing when you want fast/offline search:

```bash
mymind sync --since 30d
mymind search "design notes" --data-source local
```

Filter object lists without using the standalone search command:

```bash
mymind objects list --q "tag:reading" --limit 50 --json
mymind objects list --space-id <space_id> --json
```

### Save Objects

Save a URL:

```bash
mymind objects create \
  --url "https://example.com/article" \
  --title "Example article" \
  --tags "reading,research" \
  --json
```

Save a note or text snippet:

```bash
mymind objects create \
  --content "Meeting note: follow up on the search UX." \
  --title "Search UX follow-up" \
  --tags "notes,work" \
  --json
```

Send a structured create request through stdin:

```bash
printf '%s\n' '{"url":"https://example.com","title":"Example","tags":["reading"]}' |
  mymind objects create --stdin --json
```

Preview a write before sending it:

```bash
mymind objects create --url "https://example.com" --dry-run
```

### Read Objects

List recent objects:

```bash
mymind objects list --limit 20
mymind objects list --limit 20 --json --select id,title,url,bumped
```

Fetch one object and its readable content:

```bash
mymind objects get <object_id> --json
mymind objects content get-object <object_id>
```

Fetch object media when available:

```bash
mymind objects thumbnail get-object <object_id> --size 640x640 --deliver file:thumb.jpg
mymind objects screenshot get-object <object_id> --deliver file:screenshot.png
mymind objects blob get-object <object_id> --deliver file:original.bin
```

### Update And Delete

Update editable metadata:

```bash
mymind objects update <object_id> --title "Better title" --summary "Short useful summary" --json
```

Soft-delete an object. Deleted objects are recoverable for 30 days:

```bash
mymind objects delete <object_id> --yes
```

Use idempotent flags in scripts where a repeated run should not fail:

```bash
mymind objects create --url "https://example.com" --idempotent --json
mymind objects delete <object_id> --ignore-missing --yes
```

### Organize With Tags And Spaces

Tags are created implicitly when first used:

```bash
mymind tags --limit 100
mymind objects tags add-object <object_id> --tags "reading,research"
mymind objects tags remove-object <object_id>
```

`remove-object` removes the object's tag assignment through the API endpoint; use `objects get` after the call if you need to confirm the final tag set.

Spaces are explicit containers:

```bash
mymind spaces list
mymind spaces create --name "Research" --color "#3B82F6" --json
mymind spaces objects add-to-space <space_id> <object_id>
mymind spaces objects remove-from-space <space_id> <object_id>
```

### Sync, Analyze, Export, Import

Sync API data into local SQLite:

```bash
mymind sync
mymind sync --since 7d
mymind sync --full --concurrency 8
```

Analyze synced data:

```bash
mymind analytics --type objects
mymind analytics --type objects --group-by type --limit 10 --json
```

Export and import JSONL:

```bash
mymind export objects --format jsonl --output mymind-objects.jsonl
mymind import objects --input mymind-objects.jsonl --dry-run
```

### Agent And Script Patterns

Use `--agent` when another program is calling the CLI. It sets JSON, compact output, no prompts, no color, and yes-confirmation defaults:

```bash
mymind search "renewal notes" --agent
mymind objects list --agent --select id,title,url
```

Route output to a file without shell redirection:

```bash
mymind search "tax receipts" --json --deliver file:receipts.json
```

Discover the right command:

```bash
mymind which "search objects"
mymind api
mymind agent-context --json
```

### Other Commands

- `mymind convert` converts between plain text, Markdown, and mymind prose. Source and target formats must differ.
- `mymind profile` saves reusable flag sets.
- `mymind workflow` runs compound workflows that combine multiple API operations.
- `mymind entities` is WIP and should not be used for production integrations yet.


## Output Formats

```bash
# Human-readable table (default in terminal, JSON when piped)
mymind objects list

# JSON for scripting and agents
mymind objects list --json

# Filter to specific fields
mymind objects list --json --select id,name,status

# Dry run — show the request without sending
mymind objects list --dry-run

# Agent mode — JSON + compact + no prompts in one flag
mymind objects list --agent
```

## Agent Usage

This CLI is designed for AI agent consumption:

- **Non-interactive** - never prompts, every input is a flag
- **Pipeable** - `--json` output to stdout, errors to stderr
- **Filterable** - `--select id,name` returns only fields you need
- **Previewable** - `--dry-run` shows the request without sending
- **Explicit retries** - add `--idempotent` to create retries and `--ignore-missing` to delete retries when a no-op success is acceptable
- **Confirmable** - `--yes` for explicit confirmation of destructive actions
- **Piped input** - write commands can accept structured input when their help lists `--stdin`
- **Offline-friendly** - sync/search commands can use the local SQLite store when available
- **Agent-safe by default** - no colors or formatting unless `--human-friendly` is set

Exit codes: `0` success, `2` usage error, `3` not found, `4` auth error, `5` API error, `7` rate limited, `10` config error.

## Use with Claude Code

Install the focused skill — it auto-installs the CLI on first invocation:

```bash
npx skills add nawwwal/mymind -g
```

Then invoke `/mymind <query>` in Claude Code. The skill is the most efficient path — Claude Code drives the CLI directly without an MCP server in the middle.

<details>
<summary>Use as an MCP server in Claude Code (advanced)</summary>

If you'd rather register this CLI as an MCP server in Claude Code, the installer can do it:

```bash
curl -fsSL https://raw.githubusercontent.com/nawwwal/mymind/main/install.sh | MYMIND_SETUP_MCP=claude-code sh
```

Manual setup:

```bash
brew tap nawwwal/whimsies
brew install mymind
```

Then register it:

```bash
claude mcp add mymind mymind-mcp -e MYMIND_KID=<your-kid> -e MYMIND_SECRET=<your-base64-secret>
```

</details>

## Use with Codex

Codex supports MCP servers in the CLI and IDE extension using the same `~/.codex/config.toml` configuration. OpenAI's docs show `codex mcp add` for setup and `codex mcp list` for verification.

The installer can configure Codex MCP:

```bash
curl -fsSL https://raw.githubusercontent.com/nawwwal/mymind/main/install.sh | MYMIND_SETUP_MCP=codex sh
```

Manual setup:

```bash
brew tap nawwwal/whimsies
brew install mymind
```

Then add the MCP server:

```bash
codex mcp add mymind \
  --env MYMIND_KID=your-kid \
  --env MYMIND_SECRET=your-base64-secret \
  -- mymind-mcp
codex mcp list
```

In Codex, run `/mcp` to confirm the server is active. The main MCP tool is `search`; the older generated tool name `mymind-search_search-objects` is kept only for compatibility.

Manual config, if you prefer editing `~/.codex/config.toml`:

```toml
[mcp_servers.mymind]
command = "mymind-mcp"

[mcp_servers.mymind.env]
MYMIND_KID = "your-kid"
MYMIND_SECRET = "your-base64-secret"
```

Useful project instruction for `AGENTS.md`:

```md
Use the mymind MCP server when you need to search or retrieve my mymind objects. Prefer the `search` tool for discovery, then fetch exact objects only when needed.
```

References: [Codex CLI](https://developers.openai.com/codex/cli), [Codex MCP](https://developers.openai.com/codex/mcp), [Codex plugins and skills](https://developers.openai.com/codex/plugins).

## Use with Claude Desktop

This CLI ships an [MCPB](https://github.com/modelcontextprotocol/mcpb) bundle for macOS and Windows — Claude Desktop's standard format for one-click MCP extension installs (no JSON config required).

To install:

1. Download the `.mcpb` for your platform from the [latest release](https://github.com/nawwwal/mymind/releases/latest).
2. Double-click the `.mcpb` file. Claude Desktop opens and walks you through the install.
3. Fill in `MYMIND_KID` and `MYMIND_SECRET` when Claude Desktop prompts you.

Requires Claude Desktop 1.0.0 or later. Pre-built MCPB bundles ship for macOS Apple Silicon, macOS Intel, Windows x64, and Windows ARM64; for other platforms, use the manual config below.

<details>
<summary>Manual JSON config (advanced)</summary>

If you can't use the MCPB bundle (older Claude Desktop, unsupported platform), install `mymind` with Homebrew or a pre-built binary and configure it manually.

```bash
brew tap nawwwal/whimsies
brew install mymind
```

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mymind": {
      "command": "/opt/homebrew/bin/mymind-mcp",
      "env": {
        "MYMIND_KID": "<your-kid>",
        "MYMIND_SECRET": "<your-base64-secret>"
      }
    }
  }
}
```

Use the absolute path from `command -v mymind-mcp`; GUI apps may not inherit your shell `PATH`.

</details>

## Use with Cursor

The installer can configure Cursor MCP:

```bash
curl -fsSL https://raw.githubusercontent.com/nawwwal/mymind/main/install.sh | MYMIND_SETUP_MCP=cursor sh
```

## Health Check

```bash
mymind doctor
```

Verifies configuration, credentials, and connectivity to the API.

## Configuration

Config file: `~/.config/mymind/config.toml`

Environment variables:

| Name | Kind | Required | Description |
| --- | --- | --- | --- |
| `MYMIND_KID` | key_id | Yes | mymind access key identifier. |
| `MYMIND_SECRET` | shared_secret | Yes | base64-encoded mymind access key secret; the CLI signs each request JWT. |

## Troubleshooting
**Authentication errors (exit code 4)**
- Run `mymind doctor` to check credentials
- Verify the environment variables are set: `printf "%s\n" "$MYMIND_KID"` and keep `MYMIND_SECRET` secret.
**Not found errors (exit code 3)**
- Check the resource ID is correct
- Run the `list` command to see available items

---

Generated by [CLI Printing Press](https://github.com/mvanhorn/cli-printing-press)
