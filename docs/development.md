# Development

This project publishes the public npm package `@nawwal/mymind` from the GitHub repository `github.com/nawwwal/mymind`.

## Local Setup

```sh
npm install
npm run build --if-present
npm test --if-present
```

For local MCP testing:

```sh
MYMIND_KID=your_key_id MYMIND_SECRET=your_secret npm run dev
```

If the package exposes a built CLI entrypoint, test the packed package before publishing:

```sh
npm run pack:check
```

## Environment

Do not put real mymind credentials in committed files. Use local shell environment, ignored `.env` files, or MCP client environment blocks.

Required runtime variables:

- `MYMIND_KID`
- `MYMIND_SECRET`

Optional runtime variables:

- `MYMIND_API_BASE`
- `MYMIND_USER_AGENT`
- `MYMIND_ALLOWED_FILE_ROOTS`
- `MYMIND_OUTPUT_DIR`

## CI

`.github/workflows/ci.yml` runs on pushes and pull requests with Node 22 and Node 24.
Workflows pin npm `11.12.1` because npm trusted publishing requires npm `11.5.1` or newer, and `npm@11.13.0` ships with a broken global install (`Cannot find module 'promise-retry'`).

The workflow:

- installs dependencies with `npm ci`
- runs linting if a lint script exists
- runs typechecking if a typecheck script exists
- runs tests if a test script exists
- runs the build if a build script exists
- regenerates manifest and JSON Schemas and fails if `docs/manifest.json` or `docs/schemas` drift
- checks the package contents with `npm run pack:check`

## Lockfile Strategy

`package-lock.json` is committed and is the dependency source of truth for CI and release builds. Use `npm ci` in automation. Use `npm install` only when intentionally changing dependencies, then commit the resulting lockfile update with the package manifest change.

## Publishing

`.github/workflows/publish.yml` publishes `@nawwal/mymind` when:

1. You **publish a GitHub Release** (recommended): workflow runs on `release: published`, checks that `package.json` `version` matches the release tag (e.g. tag `v1.2.3` ↔ version `1.2.3`), then runs `npm publish --access public --provenance`.
2. You trigger **Actions → Publish → Run workflow** (`workflow_dispatch`): publishes whatever version is currently in `package.json` on that ref (npm rejects if that version already exists).

`npm publish` runs **`prepublishOnly`**, which executes **`npm run verify`** (typecheck, tests, build, manifest/schema drift checks, pack check).

### Trusted publishing (OIDC, no long-lived token)

Prefer [npm Trusted Publishers](https://docs.npmjs.com/trusted-publishers): link the npm package to this repo/workflow and **do not** set `NPM_TOKEN`. The workflow already has `permissions.id-token: write` and uses `npm publish --provenance`.

Configure on npmjs.com for workflow file **`publish.yml`**, repository **`nawwwal/mymind`**.

### Classic token (fallback)

If Trusted Publishers are not configured, add an **`NPM_TOKEN`** repository secret (automation token from npm) **and** add this under the “Publish to npm” step in `publish.yml`:

```yaml
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Do **not** commit tokens.

## Release Checklist

1. Bump **`package.json` `version`** on `main` (commit + push).
2. Confirm `repository.url` points to `github.com/nawwwal/mymind`.
3. Confirm CI is green on `main`.
4. Create a **GitHub Release** whose tag matches the version (recommended: tag `v1.2.3` when version is `1.2.3`). Publishing runs automatically from `.github/workflows/publish.yml`.
5. Optionally re-run **Publish** manually from the Actions tab (`workflow_dispatch`) if you need to retry after fixing npm config (same `package.json` version will fail if already published).
6. Confirm the package:

```sh
npm view @nawwal/mymind
```

## Documentation

Keep these docs synchronized when API coverage changes:

- `README.md`
- `docs/coverage.md`
- `docs/client-configs.md` if the launch command changes
