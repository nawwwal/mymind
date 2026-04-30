# Technical Architecture

## Runtime Flow

1. `src/cli.ts` handles `--help`, `--version`, env loading, stdio transport, and stderr-only fatal errors.
2. `loadConfig` reads `MYMIND_KID`, `MYMIND_SECRET`, optional API base/user-agent, upload roots, and output directory.
3. `createMymindMcpServer` constructs `McpServer`, creates `MyMindClient`, and registers tools/resources/prompts.
4. MCP clients discover capabilities through the standard MCP list calls.
5. Tool handlers call `MyMindClient`, then return text JSON plus `structuredContent` where possible.

## Key Modules

- `src/config.ts`: environment parsing and runtime config.
- `src/server.ts`: MCP server assembly and instructions.
- `src/cli.ts`: npm binary and stdio startup.
- `src/mymind/client.ts`: fetch wrapper, request signing, endpoint methods, error/rate-limit parsing.
- `src/mymind/schemas.ts`: permissive but doc-aligned MyMind schemas.
- `src/tools/index.ts`: MCP tools, safety gates, dry-run behavior, upload/download path guards.
- `src/resources/index.ts`: read-only MCP resources and URI templates.
- `src/prompts/index.ts`: reusable agent prompts for search, summarize, save, and organize workflows.
- `scripts/pack-check.mjs`: isolated-cache npm pack check for repeatable local verification.

## Package Shape

- Package name: `@nawwal/mymind-mcp`
- Binary: `mymind-mcp`
- Module format: ESM
- Node support: `>=22`
- npm version policy: `packageManager` pins `npm@11.13.0`
- GitHub repo target: `github.com/nawwwal/mymind-mcp`
- npm package includes: `dist`, `docs`, `README.md`, `LICENSE`

## Transport Policy

This is stdio-only for phase 1. Stdio is the safest fit for local MCP clients and avoids exposing private MyMind credentials or content over a hosted network surface.

Do not add HTTP/SSE/WebSocket transports unless the roadmap explicitly changes.

## Testing Architecture

- `tests/server.test.ts`: MCP discovery through in-memory client/server transport.
- `tests/mymind-client.test.ts`: auth signing, endpoint matrix, upload form behavior, rate limits, errors, schemas.
- `tests/tools-resources-prompts.test.ts`: annotations, confirmation/dry-run behavior, path safety, resources, prompts.
- `tests/package.test.ts`: package metadata, docs links, npm pack contents.
- `tests/config.test.ts`: env parsing and required credentials.
