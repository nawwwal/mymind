# MCP Surface

## Tools

Objects:

- `mymind_list_objects`
- `mymind_create_object`
- `mymind_get_object`
- `mymind_find_related_objects`
- `mymind_download_object`
- `mymind_get_object_content`
- `mymind_update_object`
- `mymind_replace_note_content`
- `mymind_add_object_tags`
- `mymind_add_object_spaces`
- `mymind_pin_object`
- `mymind_unpin_object`
- `mymind_delete_object`
- `mymind_restore_object`

Spaces:

- `mymind_create_space`
- `mymind_get_space`
- `mymind_list_spaces`
- `mymind_update_space`
- `mymind_delete_space`
- `mymind_add_object_to_space`
- `mymind_remove_object_from_space`

Other:

- `mymind_list_tags`
- `mymind_get_entity`
- `mymind_search_objects`
- `mymind_convert_content`

## Resources

- `mymind://objects/{id}`
- `mymind://objects/{id}/content/{format}`
- `mymind://spaces`
- `mymind://spaces/{id}`
- `mymind://tags`
- `mymind://entities/{id}`

## Prompts

- `search_mymind`
- `summarize_mymind_object`
- `save_to_mymind`
- `organize_mymind_object`

## Safety Behavior

- Read-only annotations are reserved for tools that do not mutate MyMind or the local environment.
- Write/destructive/high-cost operations include confirmation fields.
- Most mutating/high-risk tools support `dryRun` previews.
- Download-to-file mode requires `MYMIND_OUTPUT_DIR` and `confirmWrite`.
- Uploads require `MYMIND_ALLOWED_FILE_ROOTS`.
- Path guards use `realpath` to avoid symlink escapes.
- Tool results include JSON text and `structuredContent` when possible.

## Host Confirmation Caveat

Confirmation fields are friction inside the tool schema. They are not a replacement for MCP host approval. The host/client must still show and approve tool calls before private data is changed or written locally.
