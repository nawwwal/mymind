# API Coverage

This document tracks how the official mymind API documentation pages map to this MCP server.

The server is an unofficial, personal-use bridge. "Covered" means this package exposes practical MCP tools for the page's main runtime behavior, not that every field, endpoint variant, quota rule, or account-plan behavior is guaranteed.

Status meanings:

- `Covered`: the page maps to active MCP tools or client behavior.
- `Partially covered`: the page maps to active behavior, but some documented operations are not exposed as MCP tools yet or are intentionally limited.
- `Reference-only`: the page informs implementation details, validation, or docs, but does not expose a dedicated MCP tool group.
- `Known gap`: the page describes behavior that this package does not currently implement as user-facing MCP tools.

| mymind API page | Status | MCP coverage |
| --- | --- | --- |
| `api` | Reference-only | Establishes the API host, JSON conventions, user-agent expectation, and overall documentation index. No standalone MCP tool is exposed. |
| `authentication` | Covered | Implemented by the client wrapper. Each request signs an HS256 JWT with `kid`, uppercase method, and request path, then sends it as a bearer token. |
| `access-control` | Reference-only | Documented as a credential/account-scope concern. This server does not narrow mymind's access scope; users must choose the right mymind key. |
| `rate-limits` | Covered | Client responses parse `RateLimit-Policy`, `RateLimit`, and `RateLimit-Cost` metadata and return it in tool results. |
| `errors` | Covered | RFC problem-style JSON errors are converted into typed `MyMindApiError` objects and surfaced through MCP tool errors/results. |
| `objects` | Covered | Tools expose list, create from URL/content/file, get, update metadata, soft delete, restore, pin/unpin, related search, inline download, download-to-file, get text content, replace note content, add tags, and add spaces. |
| `spaces` | Covered | Tools expose list, create, get, update, delete, add object, and remove object workflows. |
| `tags` | Partially covered | Tools expose tag listing and adding tags to objects. Standalone tag lookup, editing, merging, or deletion are not exposed as MCP tools. |
| `entities` | Partially covered | A read-only get-by-id tool is exposed. The upstream Entities page is treated as WIP/limited, so agents should not assume complete entity workflows. |
| `convert` | Partially covered | Tools convert among `text/plain`, `text/markdown`, and `application/prose+json`. Other formats are not exposed through the conversion tool. |
| `search` | Covered | Search is exposed against the authenticated account. Semantic/rerank options require explicit high-cost confirmation. |
| `types` | Reference-only | Used to understand shared response shapes and request fields. No standalone `types` tool group is exposed. |
| `clients` | Reference-only | Used to guide SDK/client structure. End users interact through MCP clients instead. |
| `supported-formats` | Known gap | Used to document expected content/upload limits. No runtime format-discovery tool is exposed, and upload support is constrained by `MYMIND_ALLOWED_FILE_ROOTS` plus the server's file-size guardrail. |
| `markdown-support` | Reference-only | Used to guide content formatting behavior. Markdown can be used for text content and conversion, but no standalone markdown-support tool is exposed. |
| `prose` | Reference-only | Used as implementation and behavior reference for `application/prose+json`. No standalone prose editor or schema-builder tool group is exposed. |

## Covered Areas

### Objects

Objects are the central saved items in mymind. MCP tools in this area preserve user intent, require confirmation for writes or high-cost actions, and return enough metadata for clients to explain what happened.

### Spaces

Spaces are treated as organization primitives. Tools should prefer explicit space ids or exact matches when possible and should make ambiguity visible.

### Tags

Tags are treated as lightweight organization primitives. Current MCP coverage is intentionally narrower than the client layer: users can list tags and add tags to objects, but there is no standalone tag-editing tool group.

### Entities

Entities are used when the API exposes structured concepts beyond plain tags or spaces. Current MCP coverage is read-only get-by-id and should be treated as experimental until the upstream page is no longer WIP.

### Convert

Conversion tools make the input type and output assumptions clear. Unsupported content should fail with a clear message rather than silently creating a poor object.

### Search

Search tools may expose private saved content. Results should be scoped to the authenticated account and should return concise, useful summaries rather than excessive private text.

## Limitations

- This is unofficial coverage and can lag behind changes in the mymind API.
- Account-plan gates, credit costs, and rate limits are surfaced where practical, but they remain enforced by mymind.
- Private saved content returned by read tools becomes visible to the MCP host conversation.
- Host confirmation is a client/host behavior. Confirmation fields in tool schemas help prevent accidental calls but are not a substitute for reviewing the actual tool call.
- `MYMIND_API_BASE` should remain on the default host unless the user explicitly trusts the override target.

## Reference-only Areas

Reference-only pages still matter. They shape validation, formatting, type names, and documentation, but users should not expect one MCP tool group for each reference page.

## Updating Coverage

When implementation adds or removes MCP tools, update this file and the README coverage summary in the same change.
