---
name: npm-release-workflow
description: >-
  Cuts an npm release for @nawwal/mymind via GitHub Actions Trusted Publisher:
  version bump, verify, tag, and published GitHub Release. Use when the user
  asks to ship a release, publish to npm, tag a version, or run the publish
  workflow.
---

# npm release workflow (`@nawwal/mymind`)

## Preconditions

- **`npm whoami`** (optional sanity): publishing happens in CI, not locally with a token.
- npm **Trusted Publisher** links this GitHub repo to `@nawwal/mymind` (org maintains this).
- **`main` is green** (`.github/workflows/ci.yml`) before versioning.

## What triggers npm

Workflow: `.github/workflows/publish.yml`.

- **`release` / `published`** — primary path. Creating **only** a git tag is **not** enough; the workflow runs when a **GitHub Release** is published for that tag.
- **`workflow_dispatch`** — manual rerun from the Actions tab (same checkout ref as selected).

CI installs **`npm@11.12.1`** via corepack and runs **`npm publish --access public --provenance`**. `prepublishOnly` runs **`npm run verify`** (full checks + drift gates).

## Release tag rule

For release events, CI asserts:

`package.json` **`version`** === GitHub release **`tag_name`** without the leading **`v`**.

Example: tag **`v1.0.4`** requires **`"version": "1.0.4"`** in `package.json`.

## Agent checklist (ordered)

1. **`npm run verify`** on the branch you are about to merge or release from; fix failures first.
2. **Bump version** in `package.json` (and keep lockfile in sync, e.g. `npm install --package-lock-only`).
3. **Align default User-Agent** strings that embed the package version:
   - `src/mymind/client.ts` → `DEFAULT_USER_AGENT`
   - `src/config.ts` → default `MYMIND_USER_AGENT` fallback
   - `tests/config.test.ts` → expected `userAgent` in the defaults test
4. **Regenerate manifest version**: `npm run manifest` (or full **`npm run verify`** — updates `docs/manifest.json` and related generated docs).
5. **Commit** something like `chore(release): X.Y.Z` (single focused commit for the bump is fine).
6. **`git push origin main`** (or the release branch policy you use).
7. **`git tag vX.Y.Z`** and **`git push origin vX.Y.Z`**.
8. **Publish the GitHub Release** for that tag (so `release` → `published` fires), e.g.:

   ```sh
   gh release create vX.Y.Z --title "@nawwal/mymind vX.Y.Z" --notes "<short changelog>"
   ```

9. Watch **Actions → Publish**; confirm **`npm view @nawwal/mymind version`** matches after propagation.

## Local publish

Avoid **`npm publish`** from a laptop if the package uses **OIDC / Trusted Publishers** and **passkey 2FA** blocks OTP. Prefer the GitHub Release path above.

## Related repo docs

- Release hygiene and smoke expectations: [.agents/safety-release.md](../../safety-release.md)
- Workflow file: [`.github/workflows/publish.yml`](../../../.github/workflows/publish.yml)
