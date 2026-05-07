# Mymind CLI

The mymind API uses signed per-request JWT bearer tokens. Objects are saved URLs,
notes, images, documents, videos, or files. Objects can have tags, spaces, notes,
content, blobs, screenshots, and AI-generated metadata.

## Install

### Homebrew

Once releases are published, install both `mymind` and `mymind-mcp` with:

```bash
brew tap nawwwal/mymind
brew install mymind
```

### Go

Install directly from the source repo:

```bash
go install github.com/nawwwal/mymind/cmd/mymind@latest
go install github.com/nawwwal/mymind/cmd/mymind-mcp@latest
```

### From Source

```bash
make build-all
```

### Pre-built binary

Download and install both `mymind` and `mymind-mcp` from the [latest release](https://github.com/nawwwal/mymind/releases/latest).

macOS Apple Silicon:

```bash
VERSION="$(curl -fsSLI -o /dev/null -w '%{url_effective}' https://github.com/nawwwal/mymind/releases/latest | sed 's#.*/tag/##')"
ASSET_VERSION="${VERSION#v}"
ASSET="mymind_${ASSET_VERSION}_darwin_arm64.tar.gz"
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
ASSET="mymind_${ASSET_VERSION}_darwin_amd64.tar.gz"
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
ASSET="mymind_${ASSET_VERSION}_linux_amd64.tar.gz"
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
$asset = "mymind_${assetVersion}_windows_amd64.zip"
Invoke-WebRequest "https://github.com/nawwwal/mymind/releases/download/$version/$asset" -OutFile $asset
Invoke-WebRequest "https://github.com/nawwwal/mymind/releases/download/$version/checksums.txt" -OutFile checksums.txt
$expected = ((Select-String -Path checksums.txt -Pattern " $asset$").Line -split ' ')[0].ToUpper()
$actual = (Get-FileHash $asset -Algorithm SHA256).Hash
if ($actual -ne $expected) { throw "checksum mismatch for $asset" }
Expand-Archive $asset -DestinationPath "$HOME\bin\mymind" -Force
$env:Path = "$HOME\bin\mymind;$env:Path"
mymind.exe version
```

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

## Commands

### convert

Manage convert

- **`mymind convert content`** - Converts between plain text, Markdown, and mymind prose. Source and target formats must differ.

### entities

Manage entities

- **`mymind entities get-entity`** - WIP/coming soon. The docs say type identifiers, property shapes, and this endpoint
may change before launch. Do not ship production integrations against this path yet.

### mymind-search

Manage mymind search

- **`mymind mymind-search search-objects`** - Search with Lucene-inspired syntax, optional semantic search, related-object matching,
and Mastermind-only reranking.

### objects

Manage objects

- **`mymind objects create`** - Creates an object from exactly one of `url`, `content`, or multipart `blob`.
Duplicate URL/content/blob saves return the existing object, refresh `bumped`,
and respond with 200 instead of 201.
- **`mymind objects delete`** - Soft-deletes an object. Deleted objects are recoverable for 30 days.
- **`mymind objects get`** - Get an object
- **`mymind objects list`** - Returns objects accessible to the authenticated key. If `q` is present, search
semantics and search credit costs apply. Deleted objects are excluded.
- **`mymind objects update`** - Update object metadata

### spaces

Manage spaces

- **`mymind spaces create`** - Create a space
- **`mymind spaces delete`** - Deletes the space; objects inside are not deleted.
- **`mymind spaces get`** - Get a space
- **`mymind spaces list`** - List spaces
- **`mymind spaces update`** - Update a space

### tags

Manage tags

- **`mymind tags list`** - Tags are created implicitly when first used; there is no standalone create tag endpoint.


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

If you'd rather register this CLI as an MCP server in Claude Code, install the MCP binary first:

```bash
go install github.com/nawwwal/mymind/cmd/mymind-mcp@latest
```

Then register it:

```bash
claude mcp add mymind mymind-mcp -e MYMIND_KID=<your-kid> -e MYMIND_SECRET=<your-base64-secret>
```

</details>

## Use with Claude Desktop

This CLI ships an [MCPB](https://github.com/modelcontextprotocol/mcpb) bundle — Claude Desktop's standard format for one-click MCP extension installs (no JSON config required).

To install:

1. Download the `.mcpb` for your platform from the [latest release](https://github.com/nawwwal/mymind/releases/latest).
2. Double-click the `.mcpb` file. Claude Desktop opens and walks you through the install.
3. Fill in `MYMIND_KID` and `MYMIND_SECRET` when Claude Desktop prompts you.

Requires Claude Desktop 1.0.0 or later. Pre-built bundles ship for macOS Apple Silicon (`darwin-arm64`) and Windows (`amd64`, `arm64`); for other platforms, use the manual config below.

<details>
<summary>Manual JSON config (advanced)</summary>

If you can't use the MCPB bundle (older Claude Desktop, unsupported platform), install the MCP binary and configure it manually.

```bash
go install github.com/nawwwal/mymind/cmd/mymind-mcp@latest
```

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mymind": {
      "command": "mymind-mcp",
      "env": {
        "MYMIND_KID": "<your-kid>",
        "MYMIND_SECRET": "<your-base64-secret>"
      }
    }
  }
}
```

</details>

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
