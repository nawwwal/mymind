# Upstream diff: this repo vs mymindcorp/api

Generated during implementation; refresh when [`mymindcorp/api`](https://github.com/mymindcorp/api) ships real clients.

| Area | mymindcorp/api (HEAD) | This repo (`@nawwal/mymind`) |
|------|------------------------|------------------------------|
| TS client | Empty stub under `clients/typescript/` | Full `MyMindClient` in `src/mymind/client.ts` |
| Namespaces | Intended: `client.objects.list`, … | Implemented: `objects`, `spaces`, `tags` namespaces + flat methods |
| Version | pre-0.0.1 | 1.0.0 |
| Auth | Key pair + JWT per request | Same |

Action: re-run comparison after upstream publishes TypeScript sources.
