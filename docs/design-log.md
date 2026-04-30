# Design log

Ad-hoc notes for CLI/TUI evolution (keep short).

- 2026-05: Introduced `theme.ts` wrappers over `picocolors` for consistent, color-aware messaging.
- 2026-05: Expanded the TTY language into semantic tokens (`color`, `glyph`, `copy`) and borderless formatters. Chose spacing and dim metadata over boxed tables to stay aligned with mymind's quiet editorial feel.
