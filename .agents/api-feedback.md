# mymind API feedback (alpha)

Structured log for mymind team / alpha testing. Entries use `[ ]` open / `[x]` resolved.

## Bugs / drift

- `**GET /objects/:id/download` (implementation) vs `GET /objects/:id/blob` (canonical spec).** Client now uses `/blob`; confirm whether `/download` was ever valid.
- `**GET /objects/:id/related` (implementation) vs `GET /search?similarTo=<uid>` (canonical spec).** Client now uses `/search` with `similarTo`; confirm `/related` removal.

## Missing endpoints / capabilities

- `**GET /me` or `/whoami`** to expose effective access level + content scope without user-declared metadata at login.
- **Entities API** marked WIP in older docs; not in canonical spec. Tool + resource removed until shipped.
- **Server-side `since` filter** on `GET /objects` (CLI filters client-side today).

## Upstream sync (mymindcorp/api)

Last reviewed: 2026-05-01 — `[mymindcorp/api](https://github.com/mymindcorp/api)` README states pre-0.0.1; `clients/typescript/` stub empty.

- Align internal `MyMindClient` with namespaced surface (`client.objects.`*, `client.spaces.*`, `client.tags.*`) while keeping flat aliases for tests.

## Upstream contribution policy

Promote to public issue/PR when: (1) affects multiple integrators, (2) minimal repro exists, (3) not specific to this CLI/MCP UX only.

## Resolved

- **[x] JWT payload must include `exp` (and typically `iat`).** Client now sends both; API returned `AUTH_INVALID` / "Missing expiration (exp)" without them.

(Add releases here when confirmed.)