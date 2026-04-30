# Palette (CLI)

CLI styling uses `picocolors` behind `src/cli-app/theme.ts`. Respect `NO_COLOR`, `--no-color`, and non-TTY contexts.

No separate brand hex system is enforced in-repo; prefer semantic helpers (`emphasis`, `muted`, `warnStyle`) when adding TUI output.
