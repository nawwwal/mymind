# mymind Installer, Updater, and Search UX Design

Date: 2026-05-08

## Goal

Make the curl installer safe to rerun, add a native `mymind update` command that updates by detected install method, and improve the human CLI experience without polluting agent output.

The current weak joint is repeat execution. `install.sh` treats every run as a first install: it can re-prompt for credentials, call MCP add commands that fail on existing server names, and show noisy curl progress. Search has a separate issue: the data path already hydrates results, but the human renderer truncates summaries and tag lists too aggressively.

## Approach

Use the installer plus native updater model.

`install.sh` remains the bootstrapper. It downloads release assets, records curl-install metadata, writes or reuses credentials, and reconciles MCP client config.

`mymind update` becomes the durable updater. It detects how the current binary was installed, chooses the right update path, updates both `mymind` and `mymind-mcp` when it owns them, and then repairs MCP client pointers.

This avoids a shell-only control plane. Shell stays good at bootstrap. Go owns repeatable detection, structured decisions, and tests.

## Brand And Terminal UI

Orange is the main brand color. Use it as the primary active accent in TTY output. The closest visible color from the current mymind.com CSS is `#fa8a43`. Yellow, including `#ffd300`, is secondary and should only mark highlights or active substeps.

Terminal motion means visible work state, not decoration. Use short status lines such as:

- `Downloading mymind v1.3.4...`
- `Verifying checksum...`
- `Installing binaries...`
- `Searching...`
- `Fetching result details...`

Animated ellipses are allowed only when both stdout and stderr are real terminals. They must stop and clear cleanly before the next line prints.

Disable color and motion for:

- `--json`
- `--agent`
- piped or redirected stdout
- CI
- `NO_COLOR`
- `TERM=dumb`

## Installer Behavior

The installer must be idempotent.

On startup it detects:

- install target directory
- existing `mymind` and `mymind-mcp` paths
- existing mymind config at `~/.config/mymind/config.toml` or `MYMIND_CONFIG`
- whether saved config has both `kid` and `secret`
- detected MCP clients
- existing `mymind` MCP entries in those clients

Credential handling:

- If `MYMIND_KID` and `MYMIND_SECRET` are supplied, save them.
- If saved config already has usable credentials, do not ask again.
- If credentials are missing and the user chooses MCP setup, ask once.
- If credentials are missing and the user skips MCP, finish the install and print the auth command.

MCP handling:

- Do not call `codex mcp add` or `claude mcp add` blindly.
- If a `mymind` MCP server exists and points to the intended `mymind-mcp`, report it as already configured.
- If it exists and points to an old path, replace or update it.
- If it does not exist, add it.
- For JSON-backed clients, rewrite only the `mcpServers.mymind` object and preserve unrelated config.

Human choice flow:

Default prompt:

```text
MCP setup
  1) Update all detected clients
  2) Choose clients
  3) Skip
Choose [1]:
```

If no clients are detected, skip the menu and print the command to rerun with `MYMIND_SETUP_MCP`.

Script behavior:

- `MYMIND_SETUP_MCP=all` means all detected clients.
- `MYMIND_SETUP_MCP=none` means skip.
- `MYMIND_YES=1` accepts safe defaults.
- Non-interactive mode never prompts.

## Install Metadata

Curl installs write metadata to:

```text
~/.config/mymind/install.json
```

Fields:

- `method`: `curl`
- `version`
- `repo`
- `installed_at`
- `install_dir`
- `mymind_path`
- `mymind_mcp_path`
- `platform`

This file is advisory. `mymind update` must still verify the live binary path because users can move files after install.

## Native `mymind update`

Command:

```sh
mymind update
```

Detection order:

1. Homebrew ownership: current binary resolves under the active Homebrew prefix and `brew info nawwwal/whimsies/mymind` succeeds.
2. Curl metadata: metadata exists and the current binary path matches or clearly derives from it.
3. Go install/source: binary path is under `GOBIN`, `GOPATH/bin`, or a repo `bin/` directory.
4. Unknown: no safe ownership.

Behavior:

- Homebrew: run `brew upgrade nawwwal/whimsies/mymind`, or print that command in `--dry-run`.
- Curl: download latest GitHub release asset for the current platform, verify `checksums.txt`, replace `mymind` and `mymind-mcp`, update install metadata, and reconcile MCP config.
- Go/source: print the detected method and the right source command; do not overwrite files.
- Unknown: print the current binary path and refuse to guess.

Flags:

- `--dry-run`: show intended method and actions.
- `--yes`: skip confirmations where the command has a safe, detected method.
- `--check`: report whether an update is available without changing files.
- `--json`: emit structured status.
- `--repair-mcp`: reconcile MCP config without updating binaries.

The command should update MCP pointers after binary updates. It should not rewrite stored credentials unless the user supplies new credentials.

## Search UX

Human search output should use a search-specific renderer instead of the generic table/card renderer.

Each result should show:

- title
- score when present
- type when present
- URL when present
- full summary
- full tag list
- created/modified dates when present
- hydration error when present

Do not truncate summaries or tags in the search-specific human renderer. Let long content wrap naturally.

JSON behavior remains machine-first:

- Default JSON preserves `summary` and `tags`.
- `--agent` keeps compact output.
- `--select` is authoritative.
- `--matches-only` still returns raw ranked matches without hydration.

TTY status:

- Print `Searching...` while the live search request is in flight.
- Print `Fetching result details...` while hydrating object details.
- In local search, print `Searching local archive...`.
- Suppress all status lines when stdout is not a terminal or machine output is requested.

## Error Handling

Installer and updater errors should name the failed step and the recovery command.

Examples:

- Existing credentials are invalid: tell the user to run `mymind auth set-key`.
- Existing MCP server points to a missing binary: update the command path when possible.
- Existing MCP config is invalid JSON: leave it untouched and print the file path.
- Checksum is missing or invalid: abort before replacing binaries.
- Unknown install method: refuse to overwrite and print the detected binary path.

## Tests

Add tests at the boundaries that can regress:

- installer shell syntax with `sh -n install.sh`
- installer helper behavior through shell-level test fixtures where practical
- Go unit tests for install-method detection
- Go unit tests for update plan generation
- Go unit tests for search result rendering with long summaries and many tags
- existing `go test ./...`
- `make build-all`

Manual smoke checks:

- Fresh curl install
- Repeat curl install with saved credentials
- Repeat MCP setup when Codex already has `mymind`
- Repeat MCP setup when Claude Code already has `mymind`
- `mymind update --dry-run`
- `mymind update --check --json`
- Human `mymind search` with long summary and many tags
- Agent `mymind search --agent` remains parseable JSON

## Acceptance Criteria

- Running the curl command twice does not ask for credentials if config already has them.
- Running MCP setup twice does not fail on existing `mymind` server entries.
- Download output is a clean step status in human terminals and plain output in scripts.
- `mymind update` detects Homebrew, curl, source, and unknown installs and chooses the correct behavior.
- Curl updates replace both binaries and repair MCP pointers.
- Search human output shows full summary and all tags.
- Agent, JSON, and MCP output contain no color, spinner, or progress text.
