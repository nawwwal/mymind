/** Short reference for mymind search DSL (agent-facing). */
export const SEARCH_SYNTAX_REFERENCE = `MyMind search syntax (Lucene-inspired):

Field filters:
  tag:name       type:url|article|image|video|document|sound|note
  title:words    author:text      domain:example.com
  action:read|watch|make|purchase
  completed:true|false

Operators:
  AND as space or &&
  OR as ||
  NOT as leading -
  Group with ( )
  phrase as "exact words"

Examples:
  design AND tag:reading
  type:note AND title:"weekly review"
  domain:github.com AND action:read

Combine with CLI: mymind search 'tag:wip AND type:url'
`;
