# MyMind — agent index (project brief)

**Package:** `@nawwal/mymind` on npm. **Bins:** `mymind` (CLI), `mymind-mcp` (alias entry → same MCP stdio command as `mymind mcp`).

This repo is an unofficial, agents-first bridge to the authenticated user’s MyMind account: JWT-signed HTTP client, MCP tool surface, and a scriptable CLI.

## Product thesis

Inner-loop capture belongs in the CLI (`save`, `note`, `capture`, pipelines). Outer-loop curation belongs in MCP (typed tools, resource reads, host approval). Both surfaces share the same action core and safety model.

## UX principles

- Agents are first-class users: JSON envelopes, NDJSON streams, exit codes, manifests, and schemas are contracts.
- Credential safety beats convenience: never log secrets; writes and credit-cost operations require explicit confirmation.
- TTY output should feel like mymind: restrained, quiet, no banners, no decorative boxes, one rare accent.
- The user's TUI learning goal is part of done: meaningful TTY changes update `docs/design-log.md`.

## Alpha tester role

The mymind API is evolving. Any API mismatch, undocumented response shape, or drift from the canonical spec gets logged in `.agents/api-feedback.md` before release.

## Canonical docs

| Doc | Purpose |
|-----|---------|
| [.agents/product.md](./product.md) | Product intent and scope |
| [.agents/architecture.md](./architecture.md) | Module layout and runtime flow |
| [.agents/api-context.md](./api-context.md) | API auth, limits, endpoint context |
| [.agents/mcp-surface.md](./mcp-surface.md) | Tools, resources, prompts |
| [.agents/safety-release.md](./safety-release.md) | Credentials, release rules |
| [docs/coverage.md](../docs/coverage.md) | Endpoint / behavior coverage |
| [docs/manifest.json](../docs/manifest.json) | Generated agent manifest (commands, MCP tool names, exit codes, env vars) |
| [AGENTS.md](../AGENTS.md) (repo root) | Quick start for tool-using agents |

## Code map (current)

- **Entries:** `src/bin/cli.ts`, `src/bin/mcp.ts` → `dist/cli.js`, `dist/mcp.js`
- **CLI:** `src/cli-app/root.ts` + `src/cli-app/commands/*`, `io.ts`, `theme.ts`, `manifest-data.ts`
- **MCP:** `src/mcp-stdio.ts` → `src/server.ts` → `src/tools/index.ts` (registration only; logic in `src/actions/*` + `mcp-result`, `confirm`, `paths`)
- **API:** `src/mymind/*`
- **Config / auth:** `src/config.ts`, `src/auth/credentials-file.ts`, `src/auth/store.ts` (macOS keychain optional layer)
- **Design:** `src/cli-app/theme.ts`, `src/cli-app/format/*`, `docs/brand/*`, `docs/design-log.md`
- **Tests:** `tests/*`

## Rules for implementers

- Do not log or commit real credentials.
- Keep expensive or destructive paths explicit (CLI flags, MCP confirm literals, `dryRun` previews).
- When MCP tools change names or semantics, update `src/tools/tool-input-schemas.ts`, run `npm run manifest` and `npm run schemas`, and ensure CI passes (tests + committed `docs/manifest.json` + `docs/schemas/`).
- Prefer extending `src/actions/*` for shared MCP + CLI behavior rather than duplicating business logic under `src/tools/`.
- Run `npm run verify` before release.

## Plane / roadmap

Lightweight pointer: [.agents/roadmap.md](./roadmap.md). Detailed execution status lives in Plane when configured.
