# Technical Architecture

## Runtime Flow

1. `src/bin/cli.ts` is the `mymind` CLI entry; `src/bin/mcp.ts` is the `mymind-mcp` stdio MCP entry.
2. `loadConfig` reads `MYMIND_KID`, `MYMIND_SECRET`, optional API base/user-agent, allowed file roots, and output directory; falls back to `~/.config/mymind/credentials.json` and (macOS) Keychain.
3. `createMymindMcpServer` constructs `McpServer`, creates `MyMindClient`, and registers tools, resources, and prompts.
4. MCP clients discover capabilities through standard MCP list calls.
5. Tool handlers call `MyMindClient` via `MyMindClientInterface`, then return text JSON plus `structuredContent` where possible.
6. CLI verbs reuse the same actions and emit machine-parseable JSON envelopes (or NDJSON for list verbs).

## Key Modules

- `src/config.ts`: layered credential and runtime config.
- `src/server.ts`: MCP server assembly and instructions.
- `src/cli-app/*`: citty CLI tree, output adapter, logger, theme, formatters.
- `src/mymind/client.ts`: fetch wrapper, request signing, endpoint methods, error/rate-limit parsing, retry handling.
- `src/mymind/client-interface.ts`: narrow surface that actions depend on.
- `src/mymind/schemas.ts`: permissive doc-aligned MyMind schemas.
- `src/actions/*`: shared core for MCP tools and CLI commands (confirm tiers, dry-run, path guards).
- `src/tools/index.ts`: MCP tool registrations (thin wrappers over actions).
- `src/resources/index.ts`: read-only MCP resources and URI templates.
- `src/prompts/index.ts`: agent prompts for search, summarize, save, organize.
- `scripts/build-manifest.ts`, `scripts/build-json-schemas.ts`, `scripts/build-output-schemas.ts`, `scripts/build-cli-reference.ts`: agent-readable contract generation.

## Package Shape

- Package name: `@nawwal/mymind`
- Bins: `mymind` (CLI), `mymind-mcp` (stdio MCP)
- Module format: ESM
- Node support: `>=22`
- npm version policy: `packageManager` pins `npm@11.12.1`; CI installs the same version through corepack
- GitHub repo: `github.com/nawwwal/mymind`
- npm package includes: `dist`, `docs`, `README.md`, `LICENSE`, `AGENTS.md`

## Transport Policy

Stdio-only for the MCP surface. Stdio is the safest fit for local MCP clients and avoids exposing private MyMind credentials over a hosted network surface. Do not add HTTP/SSE/WebSocket transports unless the roadmap explicitly changes.

## Testing Architecture

- `tests/server.test.ts`: MCP discovery through in-memory client/server transport.
- `tests/mymind-client.test.ts`: auth signing, endpoint matrix, upload form behavior, rate limits, errors, schemas.
- `tests/tools-resources-prompts.test.ts`: annotations, confirmation/dry-run behavior, path safety.
- `tests/actions/*.test.ts`: pure action helpers (confirm tiers, dry-run preview, path allowlist).
- `tests/cli/*`: output mode, confirm exit codes, JSON help, examples, stdin pipelines.
- `tests/e2e/mcp-full-stack.e2e.test.ts`: every MCP tool exercised through the in-memory transport with a stub client.
- `tests/schemas/*`, `tests/output-schemas.test.ts`: Ajv strict-mode validation of generated JSON Schemas.
- `tests/package.test.ts`: package metadata, docs links, npm pack contents.
- `tests/config.test.ts`: env parsing and required credentials.
