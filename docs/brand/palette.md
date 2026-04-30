# Palette (CLI)

The CLI inherits mymind's quiet editorial feel: warm accent, dark ink, muted metadata. Terminal colors are semantic wrappers in `src/cli-app/theme.ts`; these hex values document intent rather than forcing truecolor output.

| Token | Reference | Terminal mapping | Rationale |
| --- | --- | --- | --- |
| `accent` | `#C9A86A` warm gold | `yellow` | One rare highlight for titles, links, and important affordances. |
| `ink` | `#161412` near-black | default/white | Body text should be legible and calm. |
| `muted` | `#8A8177` warm grey | `dim` | Metadata, hints, and table headers. |
| `success` | `#4F7A55` moss | `green` | Only for actual success state. |
| `warning` | `#B8832F` amber | `yellow` | Rate limits and confirmation warnings. |
| `danger` | `#A8433F` clay red | `red` | Destructive errors only. |
| `link` | `#4A7A8C` subdued blue | `cyan` | OSC 8 hyperlink affordance. |

Rules:

- No banners or logos.
- No more than one accent use per small output block.
- Respect `NO_COLOR`, `MYMIND_NO_COLOR`, `--no-color`, `TERM=dumb`, and non-TTY output.
