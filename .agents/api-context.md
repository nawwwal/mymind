# MyMind API Context

## Official Pages To Track

- `https://access.mymind.com/api`
- `https://access.mymind.com/api/authentication`
- `https://access.mymind.com/api/access-control`
- `https://access.mymind.com/api/rate-limits`
- `https://access.mymind.com/api/errors`
- `https://access.mymind.com/api/objects`
- `https://access.mymind.com/api/spaces`
- `https://access.mymind.com/api/tags`
- `https://access.mymind.com/api/entities`
- `https://access.mymind.com/api/convert`
- `https://access.mymind.com/api/search`
- `https://access.mymind.com/api/types`
- `https://access.mymind.com/api/clients`
- `https://access.mymind.com/api/supported-formats`
- `https://access.mymind.com/api/markdown-support`
- `https://access.mymind.com/api/prose`

The hosted docs may be gated in some environments. When editing API behavior, verify against the official pages where possible and update both `docs/api-coverage.md` and this file.

## Auth Model

- Access keys come from `https://access.mymind.com/extensions`.
- Each request uses a bearer JWT signed with HS256.
- JWT header contains `alg: HS256` and `kid`.
- JWT payload contains uppercase `method` and documented request `path`.
- The wrapper intentionally signs the path only, not query parameters.
- `MYMIND_SECRET` must be a valid base64 secret.

## Covered Runtime Areas

- Objects: list, create from URL/content/file, get, related, download, content read, metadata update, note replacement, tags/spaces, pin/unpin, delete, restore.
- Spaces: list, create, get, update, delete, add object, remove object.
- Tags: list tags and add tags to objects. Tags are created implicitly by object tagging.
- Entities: read-only get-by-id only; upstream page is treated as WIP/limited.
- Search: GET query search with semantic/rerank options gated by confirmation.
- Convert: convert among `text/plain`, `text/markdown`, and `application/prose+json`.
- Errors: problem-style JSON converted into typed client errors.
- Rate limits: `RateLimit-Policy`, `RateLimit`, and `RateLimit-Cost` parsed into result metadata.

## Known API Boundaries

- Do not expose tag create/update/delete tools unless official docs add those endpoints.
- Do not add standalone format discovery unless the supported-formats page exposes a runtime endpoint.
- Treat entity support as partial until the official page is no longer WIP.
- Do not assume every MyMind account has Mastermind-only search/related capabilities.
- Uploads are locally constrained by `MYMIND_ALLOWED_FILE_ROOTS` and a 64 MB guardrail.

## Current Source Of Truth

- Human docs: `docs/api-coverage.md`
- Client methods: `src/mymind/client.ts`
- Schemas: `src/mymind/schemas.ts`
- Contract tests: `tests/mymind-client.test.ts`
