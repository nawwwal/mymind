# Voice

The CLI should sound like mymind feels: calm, sparse, and exact.

## Do

- Say `Saved. obj_123`, not `Successfully saved your object!`.
- Say `Removed. obj_123`, not `Deleted forever` (objects are soft-deleted).
- Put facts first: id, title, timestamp, rate-limit cost.
- Use short hints: `Hint: Pass --yes-delete to remove this object.`
- Keep warnings plain: `Rate limited. Retrying in 8s.`

## Don't

- Don't use celebratory copy.
- Don't anthropomorphize the tool.
- Don't hide credit cost or destructive effects behind vague wording.
- Don't print a welcome banner.
- Don't make JSON output poetic; machine contracts stay literal.
