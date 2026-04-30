# Product Context

## What This Is

`@nawwal/mymind` is an unofficial CLI and MCP bridge for the mymind API. The same package ships:

- `mymind` — agent-friendly CLI that mirrors every MCP tool and adds capture/bulk verbs that only make sense in a shell.
- `mymind-mcp` — local MCP stdio server for hosts like Claude, Codex, Cursor.

Both surfaces share the same action core, credential resolution, and safety model.

```sh
mymind search 'tag:reading' --json
mymind mcp
```

## Product Thesis

MyMind is valuable because it stores private personal context. This bridge makes that context usable by agents — terminal, CLI, MCP host, CI, cron — without turning it into a public SaaS, sync service, or separate knowledge base. Inner-loop capture belongs in the CLI; outer-loop curation belongs in MCP.

## Audience

- Primary: the package owner using Codex CLI, Claude, Cursor, GitHub Actions, and shell automation.
- Secondary: technically comfortable users who can create MyMind access keys and prefer scriptable tooling.
- Not primary: teams, hosted deployments, multi-user SaaS, or analytics workflows.

## What Not To Build Yet

- No hosted remote MCP server.
- No OAuth or multi-user account management.
- No database, cache, sync daemon, or background indexing.
- No custom GUI.
- No unsupported MyMind endpoint guessing.
- No broad content export or scraping workflows.

## Definition Of Done

- MCP clients discover the intended tools, resources, and prompts.
- CLI verbs share an action core with MCP tools and emit stable JSON envelopes.
- Write and destructive operations are visibly gated (`--yes-*` flags, MCP confirm literals, `dryRun`).
- `npm run verify` passes (typecheck, tests, build, manifest/schema drift, pack-check).
- Docs warn clearly about private data and unofficial status.
