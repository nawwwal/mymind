---
name: release
description: >-
  Release this repo's Go CLI and MCP server: verify, tag, publish GitHub
  release assets with GoReleaser, update the nawwwal/homebrew-whimsies tap,
  build/upload MCPB bundles, smoke-test Homebrew, and clean stale releases.
  Use when the user asks to ship, tag, publish, update Homebrew, or recover a
  failed release for mymind.
---

# Release (`mymind`)

This repo ships two binaries:

- `mymind`
- `mymind-mcp`

Normal users install both through:

```sh
brew install nawwwal/whimsies/mymind
```

Do not use the old npm release flow. This is a GoReleaser + GitHub Release + explicit Homebrew tap release.

## Source Of Truth

- Release workflow: `.github/workflows/release.yml`
- GoReleaser config: `.goreleaser.yaml`
- MCPB manifest template: `manifest.json`
- Installer: `install.sh`
- Homebrew tap repo: `nawwwal/homebrew-whimsies`
- User install command: `brew install nawwwal/whimsies/mymind`

## Required GitHub Secret

GitHub Actions must have:

```text
GORELEASER_GITHUB_TOKEN
```

It must be able to write to both:

- `nawwwal/mymind`
- `nawwwal/homebrew-whimsies`

Check it before cutting a release:

```sh
gh secret list --repo nawwwal/mymind | rg '^GORELEASER_GITHUB_TOKEN'
```

If it is missing and the active `gh` token has the right repo scopes:

```sh
gh auth token | gh secret set GORELEASER_GITHUB_TOKEN --repo nawwwal/mymind
```

Without this secret, the tag workflow fails before GoReleaser publishes.

## Preflight

Run from repo root:

```sh
git status --branch --short
go test ./...
make build-all
sh -n install.sh
node -e 'JSON.parse(require("fs").readFileSync("manifest.json","utf8")); console.log("manifest json ok")'
ruby -e 'require "yaml"; YAML.load_file(".github/workflows/release.yml"); puts "release workflow yaml ok"'
git diff --check
```

If `goreleaser` is installed:

```sh
goreleaser check
```

If not:

```sh
brew install goreleaser
```

## Version Rule

Use semver tags:

```text
vX.Y.Z
```

The released binary version is injected by GoReleaser from the tag.

## Standard Release

1. Commit the release-worthy changes to `main`.

   ```sh
   git status --short
   git add <changed-files>
   git commit -m "fix: concise release-worthy message"
   git push origin main
   ```

2. Tag and push.

   ```sh
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

3. Watch the workflow.

   ```sh
   gh run list --workflow Release --limit 3
   gh run watch <run-id> --exit-status
   ```

4. Verify the GitHub release.

   ```sh
   gh release view vX.Y.Z --json tagName,url,assets \
     --jq '{tagName,url,assets:[.assets[].name]}'
   ```

Required release assets:

- `checksums.txt`
- CLI archives:
  - `mymind_X.Y.Z_macos_apple_silicon.tar.gz`
  - `mymind_X.Y.Z_windows_x64.zip`
- MCPB bundles:
  - `mymind-mcp_X.Y.Z_macos_apple_silicon.mcpb`
  - `mymind-mcp_X.Y.Z_windows_x64.mcpb`
- `mcpb-checksums.txt`

Linux, Intel Mac, and Windows ARM assets are intentionally not shipped. The release matrix is Apple Silicon macOS plus Windows x64.

## Homebrew Verification

After the release workflow succeeds:

```sh
brew update
brew info nawwwal/whimsies/mymind
brew fetch --formula nawwwal/whimsies/mymind
```

`brew info` must show `stable X.Y.Z`.

Upgrade the local machine and smoke-test the installed binary:

```sh
brew upgrade nawwwal/whimsies/mymind
mymind version
mymind doctor
mymind search skills --json --no-cache --limit 3
mymind search skills --json --no-cache --limit 3 --select id,title,url,score
mymind objects create --url 'https://example.com/article' --tags 'reading,research' --dry-run --json
```

The search command must return useful result summaries, not only IDs/scores and not `No results`.
The dry-run body must show tags as a JSON array.

## MCPB Verification

Check macOS and Windows bundle names are present in the release.

For Windows MCPB bundles, the packed manifest must point at `.exe`:

```sh
unzip -p dist/mcpb/mymind-mcp_X.Y.Z_windows_x64.mcpb manifest.json | rg 'mymind-mcp.exe'
```

Checksums should contain plain filenames from inside `dist/mcpb`, not `dist/mcpb/...` paths.

## If GitHub Actions Fails Before GoReleaser

Most common cause: missing `GORELEASER_GITHUB_TOKEN`.

Fix the secret, delete the failed tag if no release was published, then push the tag again:

```sh
git push origin :refs/tags/vX.Y.Z
git tag -d vX.Y.Z
git tag vX.Y.Z
git push origin vX.Y.Z
```

## If GitHub Actions Fails But You Need To Publish Locally

Use this only when the workflow is blocked and the local `gh` token has write access.

```sh
GITHUB_TOKEN="$(gh auth token)" goreleaser release --clean
```

Then build/upload MCPB bundles using the same logic as `.github/workflows/release.yml`, or rerun the workflow after fixing it.

If the workflow publishes the GitHub release but Homebrew is stale, the tap update step probably failed. The active formula path is `Formula/mymind.rb`; a root-level `mymind.rb` is ignored by `brew install nawwwal/whimsies/mymind`.

```sh
tap_repo="$(brew --repo nawwwal/whimsies)"
version="X.Y.Z"
curl -fsSL "https://github.com/nawwwal/mymind/releases/download/v${version}/checksums.txt" -o /tmp/mymind-checksums.txt
sha="$(awk -v asset="mymind_${version}_macos_apple_silicon.tar.gz" '$2 == asset {print $1}' /tmp/mymind-checksums.txt)"
sed -i.bak \
  -e "s/version \".*\"/version \"${version}\"/" \
  -e "s#releases/download/v[0-9.]*/mymind_[0-9.]*_macos_apple_silicon.tar.gz#releases/download/v${version}/mymind_${version}_macos_apple_silicon.tar.gz#" \
  -e "s/sha256 \".*\"/sha256 \"${sha}\"/" \
  "$tap_repo/Formula/mymind.rb"
rm "$tap_repo/Formula/mymind.rb.bak" "$tap_repo/mymind.rb" 2>/dev/null || true
git -C "$tap_repo" diff -- Formula/mymind.rb
git -C "$tap_repo" add Formula/mymind.rb
git -C "$tap_repo" rm -f mymind.rb 2>/dev/null || true
git -C "$tap_repo" commit -m "Update mymind to X.Y.Z"
git -C "$tap_repo" push origin main
```

Then run the Homebrew verification section.

## Clean Old Releases

If the user asks for one clean current release only:

```sh
gh release list --limit 10
gh release delete vOLD --yes --cleanup-tag
```

Verify only the intended tag remains:

```sh
gh release list --limit 5
git ls-remote --tags origin 'v*'
```

## Completion Checklist

- `main` is pushed.
- `vX.Y.Z` tag exists remotely.
- GitHub release `vX.Y.Z` exists and is latest.
- Required Apple Silicon macOS and Windows x64 CLI archives and MCPB bundles are present.
- Homebrew tap shows `stable X.Y.Z`.
- `brew fetch --formula nawwwal/whimsies/mymind` succeeds.
- Installed `mymind version` prints `X.Y.Z`.
- Installed `mymind search skills --json --no-cache --limit 3` returns useful summaries with titles/URLs/scores when available.
- Installed dry-run write parses comma-separated tags.
- Worktrees for both main repo and tap repo are clean.
