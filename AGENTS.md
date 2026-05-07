# AGENTS.md — mymind CLI

**Status:** alpha. This repo is now a Printing Press generated Go CLI and MCP server for the mymind API. The old npm/TypeScript package layout no longer applies.

## Project Shape

- CLI binary: `mymind`
- MCP binary: `mymind-mcp`
- CLI entrypoint: `cmd/mymind`
- MCP entrypoint: `cmd/mymind-mcp`
- Shared implementation: `internal/`
- OpenAPI source: `.agents/generated/mymind.openapi.yaml`
- Human API notes: `.agents/mymind-openapi-spec.md`
- Release config: `.goreleaser.yaml`
- Homebrew tap target: `nawwwal/homebrew-mymind`, installed by users as `brew tap nawwwal/mymind && brew install mymind`

## Build And Verify

```sh
make build-all
go test ./...
```

Useful runtime checks:

```sh
mymind doctor --json
mymind agent-context --json
```

Printing Press checks:

```sh
printing-press dogfood --dir . --spec .agents/generated/mymind.openapi.yaml
printing-press scorecard --dir . --spec .agents/generated/mymind.openapi.yaml
```

`printing-press verify-skill` may report canonical section drift because the generated `mymind-pp-cli` naming was intentionally renamed to `mymind`.

## Credentials

mymind uses request-bound JWT auth. Do not ask users for a static bearer token unless they explicitly know what they are doing.

```sh
export MYMIND_KID="..."
export MYMIND_SECRET="..."
```

The CLI signs each request with HS256 using `method`, `path`, `iat`, and `exp`.

## Agent Usage

Prefer `--agent` for scripted or agent calls:

```sh
mymind objects list --agent --select id,title,created
mymind spaces list --agent
mymind search "design notes" --agent
```

Use `--dry-run` before writes when exploring. Destructive or mutating operations should use explicit confirmation flags such as `--yes` when required.

## Release

GoReleaser builds both binaries and updates the Homebrew tap:

```sh
goreleaser release --clean
```

The generated MCP manifest is `manifest.json`; release assets should include the CLI archives and MCP bundle assets when available.
