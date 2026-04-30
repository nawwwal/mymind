# Authentication

Credential resolution order:

1. `MYMIND_KID` + `MYMIND_SECRET`
2. `$XDG_CONFIG_HOME/mymind/credentials.json` (default `~/.config/mymind/credentials.json`, mode `0600`)
3. macOS Keychain (`com.nawwal.mymind` / `credentials`)

`mymind login` validates credentials before writing by making a cheap authenticated API request. Request signing uses a short-lived JWT payload that includes **`iat`** and **`exp`** (Unix seconds); the API rejects tokens missing `exp`. Use `--store=none` to validate without persisting, `--store=file` for the config file, or `--store=keychain`
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
