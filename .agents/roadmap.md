# Roadmap

Plane or GitHub issues should become the canonical execution tracker if this project grows. This file is only a short orientation.

## Phase 1: Shippable npm MCP Package

Status: implemented locally.

- TypeScript ESM npm package.
- Stdio-only binary.
- MyMind client auth and endpoint wrapper.
- MCP tools/resources/prompts for practical API coverage.
- Safety gates, dry-run previews, and path hardening.
- README, docs, CI, publish workflow, lockfile, and package checks.

## Phase 2: Live Validation

Next.

- Run read-only smoke tests with real `MYMIND_KID` and `MYMIND_SECRET`.
- Validate representative object, search, tag, space, content, convert, and rate-limit behavior against a real account.
- Compare live responses to schemas and docs.
- Tighten any endpoint names, costs, or response assumptions that differ from official behavior.

## Phase 3: Release Prep

- Create private GitHub repo `nawwwal/mymind-mcp`.
- Push code and run CI on Node 22 and 24.
- Configure npm trusted publisher for `publish.yml`.
- Publish `0.1.0` only after live read-only smoke passes.

## Phase 4: Post-Release Hardening

- Add optional live smoke script that never mutates by default.
- Add version-pinned MCP client config examples.
- Revisit supported-formats and entities if upstream docs become more complete.
- Consider MCP elicitation for stronger user-mediated confirmations if host support is mature.
