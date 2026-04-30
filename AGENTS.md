# AGENTS.md — using `@nawwal/mymind`

**Status:** alpha. The mymind API evolves; prefer stable exit codes and JSON envelopes over parsing error message text. API drift is tracked in [.agents/api-feedback.md](.agents/api-feedback.md).

## Install & credentials

```sh
npx -y @nawwal/mymind login --kid YOUR_KID --secret YOUR_SECRET
# macOS: --store keychain (otherwise ~/.config/mymind/credentials.json)
# or env: MYMIND_KID + MYMIND_SECRET
```

## High-signal commands

```sh
npx -y @nawwal/mymind search 'tag:reading' --json
npx -y @nawwal/mymind objects ls --since 7d --json
npx -y @nawwal/mymind get <object_uid> --json
npx -y @nawwal/mymind save https://example.com/article --yes-cost --json
```

## Introspection

```sh
npx -y @nawwal/mymind manifest
npx -y @nawwal/mymind search --syntax
```

## MCP (hosts)

Configure your client to run `npx -y @nawwal/mymind mcp` with `MYMIND_KID` / `MYMIND_SECRET` in `env`, or use `mymind install`.

## Writes & safety

Destructive or costly actions require explicit flags (`--yes`, `--yes-delete`, `--yes-replace`, `--yes-cost`) unless `MYMIND_AUTO_CONFIRM=1`. See `docs/safety.md`.

## Exit codes

Aligned with `src/actions/errors.ts`: `0` ok, `3` auth, `4` not found, `5` rate limit, `6` confirmation required, `7` dry-run preview, `64` upstream error, `141` SIGPIPE.
