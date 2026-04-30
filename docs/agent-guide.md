# Agent guide

## Choosing MCP vs CLI

- **MCP** (`mymind mcp`): Best inside Cursor, Claude Desktop, Codex, or any MCP host. Tools return JSON (`CallToolResult`); use `dryRun` and explicit confirm flags for writes and high-cost reads per tool schema.
- **CLI** (`mymind …`): Best for scripts, CI, and quick inspection. Uses the same credentials and API client; output is controlled via `MYMIND_OUTPUT` / flags.

## Credentials (resolution order)

1. `MYMIND_KID` + `MYMIND_SECRET` in the environment  
2. `~/.config/mymind/credentials.json` (or `XDG_CONFIG_HOME`)  
3. macOS Keychain item (`com.nawwal.mymind` / `credentials`), JSON body `{ kid, secret }`

Use `mymind auth status` or `mymind whoami` to see what is active without printing secrets.

## Safety defaults

- Destructive or costly operations require explicit CLI flags (`--yes-cost`, `--yes-delete`, etc.) or `MYMIND_AUTO_CONFIRM=1`.
- MCP mirrors this with literals like `confirmDelete`, `confirmHighCost`, `dryRun`.
- File reads/uploads are constrained by `MYMIND_ALLOWED_FILE_ROOTS`; downloads go through `MYMIND_OUTPUT_DIR` when saving to disk.

## Recipes

### Daily standup capture

```sh
pbpaste | mymind note --title "$(date +%F) standup" --yes-cost --json
```

### Auto-tag last week

```sh
mymind objects ls --since 7d --json | jq -r '.data[].id' | mymind tag --tag review --yes --ndjson
```

### Search-and-summarize loop

1. `mymind search "project notes" --json`
2. Pick the best id.
3. `mymind objects content <id> --format text/markdown --json`
4. Summarize from the returned content.

### GitHub Action

```yaml
jobs:
  recall:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v6
        with:
          node-version: "22"
      - run: npm install -g @nawwal/mymind
      - run: mymind search "weekly review" --json
        env:
          MYMIND_KID: ${{ secrets.MYMIND_KID }}
          MYMIND_SECRET: ${{ secrets.MYMIND_SECRET }}
```

### Codex CLI subagent recipe

Delegate shell-native capture work to a shell subagent: “Run `mymind save <url> --yes-cost --json` for each URL and return the saved ids.”

## Troubleshooting

- Exit `3`: auth failed. Run `mymind login` or set `MYMIND_KID` / `MYMIND_SECRET`.
- Exit `5`: rate limited. Check `retryAfterSeconds` in JSON stderr.
- Exit `6`: confirmation required. Add the relevant `--yes*` flag.
- Exit `64`: upstream API error. Retry with `--verbose --log-format=json`.

## Coverage

Endpoint and behavior inventory: [coverage.md](./coverage.md). Project agent index: [AGENTS.md](../AGENTS.md) and [.agents/AGENTS.md](../.agents/AGENTS.md).

Strict JSON Schema for MCP tool inputs, prompt arguments, and resource URI variables is committed under [schemas/](./schemas/) (`registry.json` and `*.schema.json`). Regenerate with `npm run schemas`; CI runs tests plus `git diff` on this tree so schemas cannot drift.
