# Development

This project publishes the public npm package `@nawwal/mymind-mcp` from the private GitHub repository `github.com/nawwwal/mymind-mcp`.

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
Workflows pin npm `11.13.0` because npm trusted publishing requires npm `11.5.1` or newer, and older npm 11 releases have shown local `npm ci` exit-handler bugs.

The workflow:

- installs dependencies with `npm ci`
- runs linting if a lint script exists
- runs typechecking if a typecheck script exists
- runs tests if a test script exists
- runs the build if a build script exists
- checks the package contents with `npm run pack:check`

## Lockfile Strategy

`package-lock.json` is committed and is the dependency source of truth for CI and release builds. Use `npm ci` in automation. Use `npm install` only when intentionally changing dependencies, then commit the resulting lockfile update with the package manifest change.

## Publishing

`.github/workflows/publish.yml` publishes to npm when a GitHub Release is published.

Publishing uses npm trusted publishing with GitHub Actions OIDC:

- no `NPM_TOKEN`
- `permissions.id-token: write`
- GitHub-hosted `ubuntu-latest` runner
- Node 24
- public npm access

The npm package settings must trust this exact GitHub workflow:

- owner: `nawwwal`
- repository: `mymind-mcp`
- workflow filename: `publish.yml`

Because the GitHub repository is private, npm provenance attestations are not expected even though trusted publishing is used. Trusted publishing still removes the need for a long-lived publish token.

## Release Checklist

1. Confirm `package.json` has the package name `@nawwal/mymind-mcp`.
2. Confirm `package.json` `repository.url` points to `github.com/nawwwal/mymind-mcp`.
3. Run the CI checks locally where practical.
4. Create a GitHub Release.
5. Let `.github/workflows/publish.yml` publish through OIDC.
6. Confirm the public package is visible:

```sh
npm view @nawwal/mymind-mcp
```

## Documentation

Keep these docs synchronized when API coverage changes:

- `README.md`
- `docs/api-coverage.md`
- `docs/client-configs.md` if the launch command changes
