# AGENTS.md — using `@nawwal/mymind`

**Status:** alpha. The mymind API evolves; prefer stable exit codes and JSON envelopes over parsing error message text. API drift is tracked in [.agents/api-feedback.md](.agents/api-feedback.md).

## Install & credentials

```sh
npm install -g @nawwal/mymind
mymind login --kid YOUR_KID --secret YOUR_SECRET
# macOS: --store keychain (otherwise ~/.config/mymind/credentials.json)
# env MYMIND_KID + MYMIND_SECRET is for ephemeral/CI use
```

## High-signal commands

```sh
mymind search 'tag:reading' --json
mymind objects ls --since 7d --json
mymind get <object_uid> --json
mymind save https://example.com/article --yes-cost --json
pbpaste | mymind note --title "$(date +%F) note" --yes-cost --json
```

All JSON outputs use `{ "v": 1, "kind": "...", "data": ..., "rateLimit": ..., "warnings": [] }` unless `--compact` is passed.

## Introspection

```sh
mymind manifest
mymind search --syntax
```

## MCP (hosts)

After `mymind login`, configure your client to run `mymind mcp`, or use `mymind install`.

## Writes & safety

Destructive or costly actions require explicit flags (`--yes`, `--yes-delete`, `--yes-replace`, `--yes-cost`) unless `MYMIND_AUTO_CONFIRM=1`. See `docs/safety.md`.

## Exit codes

Aligned with `src/actions/errors.ts`: `0` ok, `3` auth, `4` not found, `5` rate limit, `6` confirmation required, `7` dry-run preview, `64` upstream error, `141` SIGPIPE.

## Agent guarantees

- `--json`, `--ndjson`, `--compact`, stable exit codes, and committed JSON Schemas are public contracts.
- Logs and errors go to stderr; command results go to stdout.
- No telemetry, no auto-update at runtime, and no secret logging.
- Use `docs/agent-guide.md` for recipes for Codex CLI, GitHub Actions, cron, and shell pipelines.
