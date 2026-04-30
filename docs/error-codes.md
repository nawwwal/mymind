# API errors (CLI)

The HTTP client throws `MyMindApiError` (`src/mymind/client.ts`) with `status`, `message`, and optional response metadata.

## Exit mapping (CLI only)

`exitCodeForApiError` (`src/actions/errors.ts`):

- **401 / 403** → exit **3** (`AUTH`)
- **404** → exit **4** (`NOT_FOUND`)
- **429** → exit **5** (`RATE_LIMIT`)
- **Other statuses** → exit **64** (`UPSTREAM`)

MCP tools do not exit the process; they surface errors through the MCP protocol. Agents should parse tool error content and retry or adjust inputs accordingly.

For human-readable API semantics and coverage, see [coverage.md](./coverage.md) and [.agents/api-context.md](../.agents/api-context.md).
