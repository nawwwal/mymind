# Safety And Release Context

## Credential Safety

- Required runtime env (or layered equivalent):
  - `MYMIND_KID`
  - `MYMIND_SECRET`
- Optional env:
  - `MYMIND_API_BASE`
  - `MYMIND_USER_AGENT`
  - `MYMIND_ALLOWED_FILE_ROOTS`
  - `MYMIND_OUTPUT_DIR`
  - `MYMIND_OUTPUT`, `MYMIND_AUTO_CONFIRM`, `MYMIND_LOG_FORMAT`, `MYMIND_DEBUG`, `MYMIND_NO_COLOR`
- Never commit real values.
- `.env.example` must contain placeholders only.
- Leave `MYMIND_API_BASE` unset unless testing a trusted host.

Credential resolution order: env vars > `~/.config/mymind/credentials.json` (mode `0600`) > macOS Keychain (`com.nawwal.mymind`).

## Private Data Safety

MyMind content may include personal notes, private links, credentials, health data, work material, or copyrighted text. Agents should return only the minimum content needed for the task. Broad search and retrieval can expose private saved material to the active MCP conversation.

## Local File Safety

- Uploads are disabled unless `MYMIND_ALLOWED_FILE_ROOTS` is configured.
- Downloads to disk require `MYMIND_OUTPUT_DIR`.
- Path checks must stay realpath-based.
- Do not broaden file roots casually.

## Release Requirements

Before publishing:

```sh
npm run verify
```

Live smoke requires real credentials and should start read-only:

```sh
npx -y @nawwal/mymind whoami --json
npx -y @nawwal/mymind objects ls --since 7d --json
```

## npm And GitHub

- npm package: `@nawwal/mymind`
- Bins: `mymind`, `mymind-mcp`
- GitHub repo: `github.com/nawwwal/mymind`
- CI tests Node 22 and 24.
- Workflows install npm `11.12.1` through corepack and prepend the shim onto `PATH` so the toolcache npm 10.x is not used.
- Publish uses GitHub Actions OIDC trusted publishing (no `NPM_TOKEN` required).

## Known Tooling Notes

- `npm@11.13.0` ships a broken global install (`Cannot find module 'promise-retry'`); pin `11.12.1` via corepack.
- The toolcache npm in setup-node images predates Trusted Publishers; the corepack shim must be on `PATH` for OIDC publish to work.
