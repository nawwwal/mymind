# CLI exit codes

Defined in `src/actions/errors.ts` as `Exit`. The CLI uses these process exit codes:

| Code | Name | Typical cause |
|-----:|------|----------------|
| 0 | OK | Success |
| 1 | GENERIC | Unexpected error, invalid usage message |
| 2 | USAGE | Reserved / misuse |
| 3 | AUTH | HTTP 401 / 403 from API |
| 4 | NOT_FOUND | HTTP 404 |
| 5 | RATE_LIMIT | HTTP 429 |
| 6 | CONFIRM | User declined required confirmation flag |
| 7 | DRY_RUN | Reserved for dry-run early exits where used |
| 64 | UPSTREAM | Other HTTP/API failures |
| 130 | SIGINT | Interrupted |
| 141 | SIGPIPE | Broken pipe on stdout |

Mapping from `MyMindApiError`: see `exitCodeForApiError` in the same module.
