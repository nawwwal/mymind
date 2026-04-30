# Roadmap

Lightweight orientation only. Detailed execution status lives in Plane (or GitHub issues) when configured.

## Phase 1 — Shipped

`@nawwal/mymind@1.0.1` on npm with provenance via Trusted Publisher.

- TypeScript ESM npm package, Node 22+.
- `mymind` CLI and `mymind-mcp` stdio MCP server.
- Layered credential resolution (env, file, macOS Keychain).
- Strict Zod input + output JSON Schemas, machine-readable manifest, per-command JSON help.
- Stable exit codes, NDJSON list streaming, `--compact`, `--retry-max`, signal-aware shutdown.
- CI guards drift in `docs/manifest.json`, `docs/schemas/`, `docs/output-schemas/`, `docs/examples/`, `docs/cli-reference.md`.

## Phase 2 — Live Validation

- Run read-only smoke against a real account and update `.agents/api-feedback.md` with any drift.
- Validate object, search, tag, space, content, convert, and rate-limit behavior.
- Tighten any endpoint names, costs, or response assumptions that differ from official behavior.

## Phase 3 — Distribution & UX

- Generate asciinema captures for the priority TUI surfaces (`docs/brand/screenshots/`).
- Evaluate Homebrew tap and single-binary distribution once the API stabilizes.
- Multi-profile support (`--profile` is reserved today).
