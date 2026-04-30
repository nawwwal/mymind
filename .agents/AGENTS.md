# MyMind MCP Agent Index

This project is `@nawwal/mymind-mcp`: an unofficial, personal-use TypeScript MCP server that lets Claude, Codex, Cursor, and other MCP clients connect to the authenticated user's mymind account over stdio.

## Read This First

- [product.md](./product.md): what this is meant to be, who it is for, and what not to build yet.
- [architecture.md](./architecture.md): major technical architecture, runtime flow, module ownership, and package shape.
- [api-context.md](./api-context.md): MyMind API pages, endpoint coverage, auth model, rate limits, and known gaps.
- [mcp-surface.md](./mcp-surface.md): exposed tools, resources, prompts, annotations, and safety behavior.
- [roadmap.md](./roadmap.md): short roadmap and sequencing; keep this lightweight.
- [safety-release.md](./safety-release.md): private-data risks, credential handling, npm/GitHub release rules, and verification.
- [decisions.md](./decisions.md): durable decisions from implementation and council review.

## Architecture In Short

- Runtime entrypoint: `src/cli.ts` starts stdio only, writes operational failures to stderr, and must not log protocol noise to stdout.
- Server assembly: `src/server.ts` creates `MyMindClient`, registers tools, resources, and prompts, then hands the server to stdio transport.
- API layer: `src/mymind/*` owns config-driven MyMind requests, HS256 JWT signing, schemas, errors, rate-limit metadata, and endpoint methods.
- MCP surface: `src/tools/*`, `src/resources/*`, and `src/prompts/*` translate the MyMind API into agent-usable MCP capabilities.
- Tests: `tests/*` protect server discovery, API contract behavior, safety annotations, path hardening, package contents, and config loading.
- Package: public npm package, private GitHub repo target `github.com/nawwwal/mymind-mcp`, Node `>=22`, npm pinned to `11.13.0` for CI/publish.

## Current State

- Runtime wiring is implemented and covered by MCP discovery tests.
- MyMind client contract tests cover documented endpoint methods and signing behavior.
- Tool safety includes dry-run previews, confirmation fields, structured content, and realpath-based file guards.
- Docs and package metadata are aligned with the current implementation.
- Live MyMind smoke testing still requires real `MYMIND_KID` and `MYMIND_SECRET`.

## Agent Rules

- Do not expose, log, commit, or invent real MyMind credentials.
- Prefer read-only tools first; write/destructive/high-cost paths must remain explicit and reviewed.
- Keep `docs/api-coverage.md` and [.agents/api-context.md](./api-context.md) in sync when endpoint coverage changes.
- Run `npm run verify` before treating the package as shippable.
- Keep `.agents/roadmap.md` short; detailed execution status should live in GitHub/Plane if those are added later.
