# Safety And Release Context

## Credential Safety

- Required runtime env:
  - `MYMIND_KID`
  - `MYMIND_SECRET`
- Optional env:
  - `MYMIND_API_BASE`
  - `MYMIND_USER_AGENT`
  - `MYMIND_ALLOWED_FILE_ROOTS`
  - `MYMIND_OUTPUT_DIR`
- Never commit real values.
- `.env.example` must contain placeholders only.
- Leave `MYMIND_API_BASE` unset unless testing a trusted host.

## Private Data Safety

MyMind content may include personal notes, private links, credentials, health data, work material, or copyrighted text. Agents should return only the minimum content needed for the task.

Broad search and retrieval can expose private saved material to the active MCP conversation.

## Local File Safety

- Uploads are disabled unless `MYMIND_ALLOWED_FILE_ROOTS` is configured.
- Downloads to disk require `MYMIND_OUTPUT_DIR`.
- Path checks must stay realpath-based.
- Do not broaden file roots casually.

## Release Requirements

Before publishing:

```sh
npm run verify
node dist/cli.js --help
node dist/cli.js --version
```

Recommended install validation:

```sh
npx -y npm@11.13.0 --cache /private/tmp/npm11-cache ci
```

Live smoke requires real credentials and should start read-only.

## npm And GitHub

- npm package: `@nawwal/mymind-mcp`
- GitHub target: `github.com/nawwwal/mymind-mcp`
- Repo can be private while npm package is public.
- CI tests Node 22 and 24.
- Workflows pin npm `11.13.0`.
- Publish uses GitHub Actions OIDC trusted publishing.

## Known Local Tooling Note

Local npm `11.8.0` produced `Exit handler never called!` on `npm ci`. `npm@10.9.2` and `npm@11.13.0` both verified the lockfile successfully. Keep the pinned npm version unless there is a deliberate tooling upgrade.
