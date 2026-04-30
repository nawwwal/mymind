# @nawwal/mymind

Unofficial **[mymind](https://access.mymind.com/extensions)** **CLI** and **MCP server** for Node.js. Install it once as `mymind`, log in once, then reuse the same saved credentials from shells, CI, cron, and MCP hosts (`mymind mcp`).

Repository: [github.com/nawwwal/mymind](https://github.com/nawwwal/mymind).

---

## New here (CLI first)

**1 — Requirements**

- **Node.js 22+**
- A mymind **access key** (kid + secret) from  
  **[access.mymind.com/extensions](https://access.mymind.com/extensions)**  
  (`MYMIND_KID` = key id, **not** your user id)

**2 — Install the CLI once**

```sh
npm install -g @nawwal/mymind
mymind --help
```

**3 — Log in once**

Recommended (default: `~/.config/mymind/credentials.json`; macOS can use Keychain):

```sh
mymind login --kid YOUR_KID --secret YOUR_SECRET
# macOS: add  --store keychain
```

After that, `mymind` and `mymind mcp` resolve credentials from the saved store. Use environment variables only for ephemeral or hosted automation:

```sh
export MYMIND_KID=YOUR_KID
export MYMIND_SECRET=YOUR_SECRET
```

**4 — Confirm it works**

```sh
mymind auth status --json
# or
mymind search --tag reading --json
```

Agents and automation should rely on **`--json`**, stable **exit codes**, and the **`manifest`** output — see [AGENTS.md](AGENTS.md) and [docs/agent-guide.md](docs/agent-guide.md).

---

## Everyday CLI commands

```sh
mymind search --tag reading --json
mymind objects ls --since 7d --limit 50 --json
mymind get <object_uid> --json
```

- Full command list: [docs/cli-reference.md](docs/cli-reference.md) (generated from the CLI manifest)
- Machine-readable surface: `mymind manifest`

---

## Optional: MCP in your AI app

If you use **Claude Desktop**, **Claude Code**, **Codex**, or **Cursor**, point them at the same package. The **installer** detects common setups and writes config:

```sh
mymind install
```

Run `mymind login` first so the MCP process can resolve credentials from your saved store. Use `mymind install --dry-run` to preview.

Under the hood the host runs the installed **`mymind mcp`** stdio server. Manual JSON/TOML examples: **[docs/client-configs.md](docs/client-configs.md)**. Longer walkthrough: **[docs/installation.md](docs/installation.md)**.

---

## Other environment variables

| Variable | Purpose |
| --- | --- |
| `MYMIND_API_BASE` | Override API base URL (only if you know you need this) |
| `MYMIND_USER_AGENT` | Override default user agent string |
| `MYMIND_ALLOWED_FILE_ROOTS` | Comma-separated allowlist for local file reads/uploads |
| `MYMIND_JWT_VALIDITY_SECONDS` | Per-request JWT `exp`−`iat` window in seconds (default **86400**, min **60**, max **604800**). Each HTTP call still mints a **new** token. |

Treat `MYMIND_SECRET` like a password: not in git, not in chat logs.

---

## What it covers

Objects, spaces, tags, search (with optional semantic/rerank when confirmed), conversion, and the MCP tool set aligned with that surface — not every upstream doc page. **Full table:** [docs/coverage.md](docs/coverage.md).

---

## Safety

This project is **unofficial** and **not** endorsed by mymind. It can read and change real account data. Use confirmation flags for destructive or costly operations; see **[docs/safety.md](docs/safety.md)**.

---

## Troubleshooting

| Issue | What to check |
| --- | --- |
| Auth errors | Run `mymind login` again, or set both `MYMIND_KID` and `MYMIND_SECRET`; try `mymind auth status --json` |
| `mymind` is not found | Run `npm install -g @nawwal/mymind` and confirm your npm global bin directory is on `PATH` |
| MCP client never shows mymind | Restart the client; confirm command `mymind` and args `["mcp"]` — see [docs/client-configs.md](docs/client-configs.md) |

---

## Development

```sh
npm install
npm run build
npm test
```

Details: [docs/development.md](docs/development.md).

## License

MIT
