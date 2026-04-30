# Safety

`@nawwal/mymind-mcp` is an unofficial integration that connects an MCP client to a real mymind account. Treat it as a local bridge to private user data.

It is not endorsed by mymind, and the mymind API may change without notice. Prefer read-only tools when validating a new setup.

## Credential Handling

- Provide credentials through environment variables only:
  - `MYMIND_KID`
  - `MYMIND_SECRET`
- Do not commit credentials to Git.
- Do not paste credentials into prompts, issues, screenshots, logs, or support threads.
- Rotate credentials if they are exposed.
- Prefer user-level MCP config for personal credentials and project-level config only when the project is private and intentionally local.

## Data Exposure

Search, lookup, and object retrieval can expose saved mymind content to the active MCP client conversation. Before running broad searches, consider whether the current chat is an appropriate place for those results.

The server cannot control what the MCP host or model does with returned private content after a tool call succeeds. Keep queries narrow, avoid broad exports, and do not route sensitive results into unrelated tools.

## Write Actions

Write-capable tools can change the authenticated account. This includes creating, updating, tagging, moving, converting, or deleting content if those operations are supported by the implementation.

Recommended behavior:

- Start with read-only calls when configuring a new client.
- Review tool-call previews before approving write actions.
- Prefer exact ids over fuzzy names for spaces, tags, and objects.
- Ask for confirmation before destructive or large batch operations.
- Keep batch operations small enough to inspect and recover.

## Host Confirmation Limits

Many write, high-cost, upload, replacement, and delete tools require explicit confirmation fields such as `confirmWrite`, `confirmHighCost`, `confirmReplace`, or `confirmDelete`. These fields are guardrails against accidental calls, not a full permission system.

The MCP host is still responsible for showing tool-call previews and asking for human approval. If a host auto-approves MCP calls, these confirmation fields can be supplied by the agent and should not be treated as proof that a human reviewed the action.

## API Host Overrides

`MYMIND_API_BASE` changes where authenticated requests are sent. Leave it unset for normal use. If you override it for testing, confirm that the host is trusted before sending real credentials or private content.

## Local Files

If upload-capable tools are available, restrict local file reads with `MYMIND_ALLOWED_FILE_ROOTS`. Keep the allowlist narrow and use absolute paths to directories that are safe for the MCP server to inspect.

If download-capable tools are available, set `MYMIND_OUTPUT_DIR` to a dedicated working directory instead of a broad home or project root.

## Private Content

Do not assume that mymind content is safe to summarize, quote, or export. Saved content may include personal notes, private links, credentials, health information, work material, or copyrighted text.

Clients and agents should:

- Return only the minimum content needed to answer the user.
- Avoid long verbatim excerpts unless the user explicitly requests them and has the right to use them.
- Avoid sending private content to unrelated tools.

## Logs

Logs should not include:

- `MYMIND_KID`
- `MYMIND_SECRET`
- Authorization headers
- full private object bodies unless explicitly needed for local debugging

When sharing logs, redact ids and content where practical.

## Recovery

If credentials leak:

1. Revoke or rotate the mymind credentials.
2. Remove the leaked values from local config and shell history.
3. Audit recent tool calls and account activity if available.
4. Reconfigure clients with the new values.
