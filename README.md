# @nawwal/mymind

Unofficial **[mymind](https://access.mymind.com/extensions)** **CLI** and **MCP server** for Node.js. Use it from shells and CI (`mymind`), or wire it into Claude, Codex, Cursor, etc. (`mymind mcp` / `npx … mcp`).

Repository: [github.com/nawwwal/mymind](https://github.com/nawwwal/mymind).

---

## New here (CLI first)

**1 — Requirements**

- **Node.js 22+**
- A mymind **access key** (kid + secret) from  
  **[access.mymind.com/extensions](https://access.mymind.com/extensions)**  
  (`MYMIND_KID` = key id, **not** your user id)

**2 — Run the CLI (nothing to “install” for most people)**

The package is meant to be run with **`npx`** so you always get a published build:

```sh
npx -y @nawwal/mymind --help
```

Optional global install if you want a `mymind` on your `PATH`:

```sh
npm install -g @nawwal/mymind
mymind --help
```

**3 — Save credentials once**

Recommended (default: `~/.config/mymind/credentials.json`; macOS can use Keychain):

```sh
npx -y @nawwal/mymind login --kid YOUR_KID --secret YOUR_SECRET
# macOS: add  --store keychain
```

Or **only for the current shell** (good for CI):

```sh
export MYMIND_KID=YOUR_KID
export MYMIND_SECRET=YOUR_SECRET
```

**4 — Confirm it works**

```sh
npx -y @nawwal/mymind auth status --json
# or
npx -y @nawwal/mymind search 'tag:reading' --json
```

Agents and automation should rely on **`--json`**, stable **exit codes**, and the **`manifest`** output — see [AGENTS.md](AGENTS.md) and [docs/agent-guide.md](docs/agent-guide.md).

---

## Everyday CLI commands

```sh
npx -y @nawwal/mymind search 'tag:reading' --json
npx -y @nawwal/mymind objects ls --since 7d --limit 50 --json
npx -y @nawwal/mymind get <object_uid> --json
```

- Full command list: [docs/cli-reference.md](docs/cli-reference.md) (generated from the CLI manifest)
- Machine-readable surface: `npx -y @nawwal/mymind manifest`

---

## Optional: MCP in your AI app

If you use **Claude Desktop**, **Claude Code**, **Codex**, or **Cursor**, point them at the same package. The **installer** detects common setups and writes config:

```sh
npx -y @nawwal/mymind install
```

Set `MYMIND_KID` and `MYMIND_SECRET` in the environment first, **or** run `mymind login` so the MCP process can resolve credentials from your saved store (when you configure it that way). Use `install --dry-run` to preview.

Under the hood the host runs **`npx -y @nawwal/mymind mcp`** (stdio). Manual JSON/TOML examples: **[docs/client-configs.md](docs/client-configs.md)**. Longer walkthrough: **[docs/installation.md](docs/installation.md)**.

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
| Auth errors | Both `MYMIND_KID` and `MYMIND_SECRET`; try `auth status --json` |
| `npx` cannot find the package | Package name `@nawwal/mymind`; registry `https://registry.npmjs.org/` |
| MCP client never shows mymind | Restart the client; confirm command `npx` and args `["-y", "@nawwal/mymind", "mcp"]` — see [docs/client-configs.md](docs/client-configs.md) |

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
