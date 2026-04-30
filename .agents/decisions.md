# Durable Decisions

## Implementation Decisions

- The server is stdio-only for phase 1.
- `src/server.ts` owns client construction and capability registration.
- MyMind JWT signing uses the documented path-only claim, excluding query strings.
- Undocumented tag detail support was removed; tags are list-only plus object-tagging.
- Entity support remains read-only and partial.
- MCP tools return text JSON and structured content where practical.
- Confirmation fields remain in schemas, but host approval is the real user confirmation.
- Dry-run previews are preferred for write/destructive/high-cost tools.
- File path safety uses `realpath`, not string prefix checks.

## Documentation Decisions

- `.agents/AGENTS.md` is the crisp project index.
- `.agents/roadmap.md` stays short and does not become a second task tracker.
- `docs/api-coverage.md` is the public coverage table.
- `.agents/api-context.md` is the agent-facing API context and source-tracking reminder.
- README links to docs, so `docs` ships in the npm package.

## Packaging Decisions

- Public npm package, private GitHub repo target.
- Node support remains `>=22`.
- CI matrix covers Node 22 and 24.
- `package-lock.json` is committed.
- `pack:check` uses `scripts/pack-check.mjs` with an isolated npm cache to avoid local `~/.npm` permission failures.
- `packageManager` pins `npm@11.13.0`.

## Open Questions

- Does MyMind explicitly permit third-party public npm clients beyond personal extension-key use?
- Are all Mastermind-gated endpoints available for the target account?
- Should future versions add MCP elicitation for stronger confirmations?
- Should supported formats become a runtime tool if MyMind adds an endpoint?
