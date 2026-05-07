---
name: mymind
description: "Printing Press CLI for Mymind. The mymind API uses signed per-request JWT bearer tokens. Objects are saved URLs, notes, images, documents, videos,..."
author: "Aditya Nawal"
license: "Apache-2.0"
argument-hint: "<command> [args] | install cli|mcp"
allowed-tools: "Read Bash"
metadata:
  openclaw:
    requires:
      bins:
        - mymind
    install:
      - kind: go
        bins: [mymind]
        module: github.com/nawwwal/mymind/cmd/mymind
---

# Mymind — Printing Press CLI

## Prerequisites: Install the CLI

This skill drives the `mymind` binary. **You must verify the CLI is installed before invoking any command from this skill.** If it is missing, install it first:

1. Install via the Printing Press installer:
   ```bash
   npx -y @mvanhorn/printing-press install mymind --cli-only
   ```
2. Verify: `mymind --version`
3. Ensure `$GOPATH/bin` (or `$HOME/go/bin`) is on `$PATH`.

If the `npx` install fails (no Node, offline, etc.), fall back to a direct Go install (requires Go 1.23+):

```bash
go install github.com/nawwwal/mymind/cmd/mymind@latest
```

If `--version` reports "command not found" after install, the install step did not put the binary on `$PATH`. Do not proceed with skill commands until verification succeeds.

The mymind API uses signed per-request JWT bearer tokens. Objects are saved URLs,
notes, images, documents, videos, or files. Objects can have tags, spaces, notes,
content, blobs, screenshots, and AI-generated metadata.

## Command Reference

**convert** — Manage convert

- `mymind convert` — Converts between plain text, Markdown, and mymind prose. Source and target formats must differ.

**entities** — Manage entities

- `mymind entities <id>` — WIP/coming soon. The docs say type identifiers, property shapes, and this endpoint may change before launch. Do not...

**mymind-search** — Manage mymind search

- `mymind mymind-search` — Search with Lucene-inspired syntax, optional semantic search, related-object matching, and Mastermind-only reranking.

**objects** — Manage objects

- `mymind objects create` — Creates an object from exactly one of `url`, `content`, or multipart `blob`. Duplicate URL/content/blob saves return...
- `mymind objects delete` — Soft-deletes an object. Deleted objects are recoverable for 30 days.
- `mymind objects get` — Get an object
- `mymind objects list` — Returns objects accessible to the authenticated key. If `q` is present, search semantics and search credit costs...
- `mymind objects update` — Update object metadata

**spaces** — Manage spaces

- `mymind spaces create` — Create a space
- `mymind spaces delete` — Deletes the space; objects inside are not deleted.
- `mymind spaces get` — Get a space
- `mymind spaces list` — List spaces
- `mymind spaces update` — Update a space

**tags** — Manage tags

- `mymind tags` — Tags are created implicitly when first used; there is no standalone create tag endpoint.


### Finding the right command

When you know what you want to do but not which command does it, ask the CLI directly:

```bash
mymind which "<capability in your own words>"
```

`which` resolves a natural-language capability query to the best matching command from this CLI's curated feature index. Exit code `0` means at least one match; exit code `2` means no confident match — fall back to `--help` or use a narrower query.

## Auth Setup

Store your access token:

```bash
mymind auth set-key YOUR_KID YOUR_BASE64_SECRET
```

Or set `MYMIND_KID` and `MYMIND_SECRET` as environment variables.

Run `mymind doctor` to verify setup.

## Agent Mode

Add `--agent` to any command. Expands to: `--json --compact --no-input --no-color --yes`.

- **Pipeable** — JSON on stdout, errors on stderr
- **Filterable** — `--select` keeps a subset of fields. Dotted paths descend into nested structures; arrays traverse element-wise. Critical for keeping context small on verbose APIs:

  ```bash
  mymind objects list --agent --select id,name,status
  ```
- **Previewable** — `--dry-run` shows the request without sending
- **Offline-friendly** — sync/search commands can use the local SQLite store when available
- **Non-interactive** — never prompts, every input is a flag
- **Explicit retries** — use `--idempotent` only when an already-existing create should count as success, and `--ignore-missing` only when a missing delete target should count as success

### Response envelope

Commands that read from the local store or the API wrap output in a provenance envelope:

```json
{
  "meta": {"source": "live" | "local", "synced_at": "...", "reason": "..."},
  "results": <data>
}
```

Parse `.results` for data and `.meta.source` to know whether it's live or local. A human-readable `N results (live)` summary is printed to stderr only when stdout is a terminal — piped/agent consumers get pure JSON on stdout.

## Agent Feedback

When you (or the agent) notice something off about this CLI, record it:

```
mymind feedback "the --since flag is inclusive but docs say exclusive"
mymind feedback --stdin < notes.txt
mymind feedback list --json --limit 10
```

Entries are stored locally at `~/.mymind/feedback.jsonl`. They are never POSTed unless `MYMIND_FEEDBACK_ENDPOINT` is set AND either `--send` is passed or `MYMIND_FEEDBACK_AUTO_SEND=true`. Default behavior is local-only.

Write what *surprised* you, not a bug report. Short, specific, one line: that is the part that compounds.

## Output Delivery

Every command accepts `--deliver <sink>`. The output goes to the named sink in addition to (or instead of) stdout, so agents can route command results without hand-piping. Three sinks are supported:

| Sink | Effect |
|------|--------|
| `stdout` | Default; write to stdout only |
| `file:<path>` | Atomically write output to `<path>` (tmp + rename) |
| `webhook:<url>` | POST the output body to the URL (`application/json` or `application/x-ndjson` when `--compact`) |

Unknown schemes are refused with a structured error naming the supported set. Webhook failures return non-zero and log the URL + HTTP status on stderr.

## Named Profiles

A profile is a saved set of flag values, reused across invocations. Use it when a scheduled agent calls the same command every run with the same configuration - HeyGen's "Beacon" pattern.

```
mymind profile save briefing --json
mymind --profile briefing objects list
mymind profile list --json
mymind profile show briefing
mymind profile delete briefing --yes
```

Explicit flags always win over profile values; profile values win over defaults. `agent-context` lists all available profiles under `available_profiles` so introspecting agents discover them at runtime.

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 2 | Usage error (wrong arguments) |
| 3 | Resource not found |
| 4 | Authentication required |
| 5 | API error (upstream issue) |
| 7 | Rate limited (wait and retry) |
| 10 | Config error |

## Argument Parsing

Parse `$ARGUMENTS`:

1. **Empty, `help`, or `--help`** → show `mymind --help` output
2. **Starts with `install`** → ends with `mcp` → MCP installation; otherwise → see Prerequisites above
3. **Anything else** → Direct Use (execute as CLI command with `--agent`)

## MCP Server Installation

1. Install the MCP server:
   ```bash
   go install github.com/nawwwal/mymind/cmd/mymind-mcp@latest
   ```
2. Register with Claude Code:
   ```bash
   claude mcp add mymind-mcp -- mymind-mcp
   ```
3. Verify: `claude mcp list`

## Direct Use

1. Check if installed: `which mymind`
   If not found, offer to install (see Prerequisites at the top of this skill).
2. Match the user query to the best command from the Unique Capabilities and Command Reference above.
3. Execute with the `--agent` flag:
   ```bash
   mymind <command> [subcommand] [args] --agent
   ```
4. If ambiguous, drill into subcommand help: `mymind <command> --help`.
