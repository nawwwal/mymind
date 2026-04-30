# Product Context

## What This Is

`@nawwal/mymind-mcp` is a local MCP bridge for the mymind API. It lets an MCP host search, retrieve, create, organize, convert, and inspect a user's saved mymind content through explicit MCP tools, resources, and prompts.

It is designed as an npm package that can be launched by MCP clients with:

```sh
npx -y @nawwal/mymind-mcp
```

## Product Thesis

MyMind is valuable because it stores private personal context. This MCP server makes that context usable by agents without turning it into a public SaaS, sync service, or separate knowledge base.

The wedge is: make a user's existing MyMind memory accessible to local agents with safe, inspectable, stdio-based tools.

## Audience

- Primary: the package owner using Claude, Codex, Cursor, or similar MCP clients.
- Secondary: technically comfortable users who can create MyMind access keys and configure local MCP clients.
- Not primary: teams, hosted deployments, multi-user SaaS, public MyMind mirroring, or analytics workflows.

## What Not To Build Yet

- No hosted remote MCP server.
- No OAuth or multi-user account management.
- No database, cache, sync daemon, or background indexing.
- No custom UI.
- No unsupported MyMind endpoint guessing.
- No broad content export or scraping workflows.

## Definition Of Done

- MCP clients can discover the intended tools/resources/prompts.
- API behavior is covered by tests or honestly marked as partial/reference-only.
- Write and destructive operations are visibly gated.
- Package can be built, packed, and launched through the npm bin.
- Docs warn clearly about private data and unofficial status.
