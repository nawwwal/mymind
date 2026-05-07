---
name: mymind
description: "Use the mymind CLI and MCP server to save, search, organize, and inspect a user's mymind library from agents."
author: "Aditya Nawal"
license: "Apache-2.0"
argument-hint: "<task or mymind command>"
allowed-tools: "Read Bash"
metadata:
  openclaw:
    requires:
      bins:
        - mymind
    install:
      - kind: shell
        command: "curl -fsSL https://raw.githubusercontent.com/nawwwal/mymind/main/install.sh | sh"
---

# mymind

`mymind` lets agents search and use the user's saved notes, bookmarks, articles,
images, documents, and references.

Use the CLI when you are in a shell. Use MCP when the host has the `mymind` MCP
server installed.

## Install

Prefer Homebrew when available:

```bash
brew install nawwwal/whimsies/mymind
```

Or use the installer:

```bash
curl -fsSL https://raw.githubusercontent.com/nawwwal/mymind/main/install.sh | sh
```

For agent hosts, let the installer wire MCP:

```bash
curl -fsSL https://raw.githubusercontent.com/nawwwal/mymind/main/install.sh | MYMIND_SETUP_MCP=all sh
```

For non-interactive installs:

```bash
curl -fsSL https://raw.githubusercontent.com/nawwwal/mymind/main/install.sh | \
  MYMIND_KID=YOUR_KID \
  MYMIND_SECRET=YOUR_BASE64_SECRET \
  MYMIND_SETUP_MCP=codex,claude-code,cursor \
  sh
```

Users should not need Go to install MCP. Only use `go install` if the user is a
Go developer and asks for source-based installation.

## Auth

```bash
mymind auth set-key YOUR_KID YOUR_BASE64_SECRET
mymind doctor
```

Environment variables also work:

```bash
export MYMIND_KID="your-kid"
export MYMIND_SECRET="your-base64-secret"
```

## First checks for agents

Before doing real work:

```bash
mymind doctor --json
```

When you know the task but not the command:

```bash
mymind which "save a URL" --json
mymind which "find notes about renewal" --json
mymind which "add object to a space" --json
```

When you need the full command tree:

```bash
mymind agent-context --pretty
```

When you need raw endpoint coverage:

```bash
mymind api
mymind api objects
```

## Search

Use search first when the user asks to find something:

```bash
mymind search "reading list" --agent
mymind search "article about memory" --semantic --rerank --agent
mymind search "renewal notes" --agent --select id,title,url,score
```

Default search returns useful summaries: `id`, `score`, `title`, `type`, `url`,
`tags`, and dates when available.

Use raw matches only when you explicitly need ranked IDs:

```bash
mymind search "renewal notes" --matches-only --json
```

## Save

Save a link:

```bash
mymind objects create --url "https://example.com/article" --tags "reading,research" --agent
```

Save a note:

```bash
mymind objects create \
  --content "Follow up on the search UX." \
  --title "Search UX note" \
  --tags "notes,work" \
  --agent
```

Use `--dry-run` before writes when exploring:

```bash
mymind objects create --url "https://example.com/article" --tags "reading,research" --dry-run --json
```

## Inspect and organize

```bash
mymind objects list --agent --select id,title,url,created
mymind objects get <object_id> --agent
mymind objects content get-object <object_id> --agent
mymind tags --agent
mymind spaces list --agent
mymind spaces objects add-to-space <space_id> <object_id> --agent
mymind objects tags add-object <object_id> --tags "reading,research" --agent
```

## Local copy and analysis

```bash
mymind sync --since 30d --agent
mymind search "design notes" --data-source local --agent
mymind analytics --type objects --agent
```

## Output contract

Use `--agent` for agent calls. It expands to:

```text
--json --compact --no-input --no-color --yes
```

Useful flags:

- `--select id,title,url` keeps only the fields needed for the task.
- `--dry-run` previews writes.
- `--deliver file:results.json` writes output to a file.
- `--no-cache` bypasses the response cache.
- `--data-source live|local|auto` controls whether reads use the API or local SQLite.

Read commands return:

```json
{
  "meta": {"source": "live"},
  "results": []
}
```

Parse `results`. Use `meta.source` to know whether data came from live API or
local sync.

## MCP

If MCP is installed, call `context` first when unsure. It explains auth,
resources, query tips, and the tool surface.

Core MCP tools:

- `context` — call first for surface guidance.
- `search` — live mymind search with useful summaries.
- `local_search` — full-text search over synced SQLite data.
- `sql` — read-only SQL over synced SQLite data.
- `objects_create`, `objects_list`, `objects_get`, `objects_update`, `objects_delete`
- `spaces_create`, `spaces_list`, `spaces_get`, `spaces_update`, `spaces_delete`
- `tags_list`

MCP `search` returns summary objects by default. Use `matchesOnly=true` only for
raw ranked IDs.

Claude Desktop users on Apple Silicon macOS or Windows x64 can install the
`.mcpb` bundle from the latest GitHub release. Codex, Claude Code, and Cursor
users should use the installer with `MYMIND_SETUP_MCP`.

## Argument parsing

If `$ARGUMENTS` is empty, `help`, or `--help`, show `mymind --help`.

If `$ARGUMENTS` starts with `install`, explain the install options above.

Otherwise:

1. Run `mymind which "$ARGUMENTS" --json` if the command is unclear.
2. Drill into help with `mymind <command> --help` when needed.
3. Execute with `--agent`.
4. Use `--dry-run` before writes unless the user clearly asked to mutate data.
