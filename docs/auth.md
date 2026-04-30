# Authentication

Credential resolution order:

1. `MYMIND_KID` + `MYMIND_SECRET`
2. `$XDG_CONFIG_HOME/mymind/credentials.json` (default `~/.config/mymind/credentials.json`, mode `0600`)
3. macOS Keychain (`com.nawwal.mymind` / `credentials`)

The recommended human setup is `npm install -g @nawwal/mymind` followed by one `mymind login`. Environment variables are mainly for CI, ephemeral shells, or MCP hosts that cannot read the saved credential store.

Set `MYMIND_DISABLE_KEYCHAIN=1` only for tests or debugging when you need to ignore macOS Keychain and prove env/file credential behavior in isolation.

`mymind login` validates credentials before writing by making a cheap authenticated API request. **Each API call** builds a fresh signed JWT: payload includes `method`, `path`, **`iat`**, and **`exp`** (Unix seconds). The `exp` value is `iat` plus a **per-request validity window** (default **24 hours**). That window is *not* how long your saved credentials last — it only bounds how long that one request’s bearer token is considered valid (clock skew, slow links, and replay surface). Override with `MYMIND_JWT_VALIDITY_SECONDS` (clamped between **60** and **604800**). The API rejects tokens missing `exp`. Use `--store=none` to validate without persisting, `--store=file` for the config file, or `--store=keychain`
on macOS.

The credential file format is:

```json
{
  "v": 1,
  "profiles": {
    "default": {
      "kid": "...",
      "secret": "...",
      "lastValidatedAt": "2026-05-01T00:00:00.000Z"
    }
  }
}
```

Multi-profile flags are reserved for a later release; `--profile` currently fails deliberately.

Secrets must never be committed, logged, or pasted into issue reports. Debug output redacts fields named
`kid`, `secret`, `MYMIND_KID`, or `MYMIND_SECRET`.
