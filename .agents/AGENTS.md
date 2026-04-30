# MyMind — agent index (project brief)

**Package:** `@nawwal/mymind` on npm. **Bins:** `mymind` (CLI), `mymind-mcp` (alias entry → same MCP stdio command as `mymind mcp`).

This repo is an unofficial, agents-first bridge to the authenticated user’s MyMind account: JWT-signed HTTP client, MCP tool surface, and a scriptable CLI.

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
- **Tests:** `tests/*`

## Rules for implementers

- Do not log or commit real credentials.
- Keep expensive or destructive paths explicit (CLI flags, MCP confirm literals, `dryRun` previews).
- When MCP tools change names or semantics, update `src/cli-app/manifest-data.ts` (`MCP_TOOL_NAMES`) and run `npm run manifest` so `docs/manifest.json` stays in sync (CI enforces this).
- Prefer extending `src/actions/*` for shared MCP + CLI behavior rather than duplicating business logic under `src/tools/`.
- Run `npm run verify` before release.

## Plane / roadmap

Lightweight pointer: [.agents/roadmap.md](./roadmap.md). Detailed execution status lives in Plane when configured.
