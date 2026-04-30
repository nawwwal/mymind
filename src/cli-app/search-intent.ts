export interface SearchIntent {
  query: string;
  warnings: string[];
  interpretedFrom?: string | undefined;
}

interface SearchIntentInput {
  q?: string | undefined;
  query?: string | undefined;
  tags?: string[] | undefined;
  type?: string | undefined;
  domain?: string | undefined;
  title?: string | undefined;
  completed?: string | boolean | undefined;
  action?: string | undefined;
}

export function parseSearchIntent(input: SearchIntentInput): SearchIntent {
  const raw = (input.query ?? input.q ?? "").trim();
  const warnings: string[] = [];
  const clauses: string[] = [];
  let interpretedFrom: string | undefined;

  const dwim = dwimQuery(raw);
  if (dwim.query) {
    clauses.push(dwim.query);
  }
  if (dwim.interpretedFrom) {
    interpretedFrom = dwim.interpretedFrom;
  }
  warnings.push(...dwim.warnings);

  if (input.type) clauses.push(`type:${quoteIfNeeded(cleanValue(input.type))}`);
  if (input.domain) clauses.push(`domain:${quoteIfNeeded(cleanValue(input.domain))}`);
  if (input.title) clauses.push(`title:${quoteIfNeeded(cleanValue(input.title))}`);
  if (input.action) clauses.push(`action:${quoteIfNeeded(cleanValue(input.action))}`);
  if (input.completed !== undefined && input.completed !== "") {
    const value = String(input.completed).toLowerCase();
    if (value !== "true" && value !== "false") {
      throw new Error("Invalid --completed (use true or false). Example: mymind search --completed false");
    }
    clauses.push(`completed:${value}`);
  }

  for (const tag of input.tags ?? []) {
    for (const part of tag.split(",")) {
      const clean = cleanValue(part);
      if (clean) clauses.push(`tag:${quoteIfNeeded(clean)}`);
    }
  }

  const query = clauses.filter(Boolean).join(" && ");
  if (!query) {
    throw new Error("Provide search text or filters. Example: mymind search --tag reading");
  }

  return interpretedFrom !== undefined ? { query, warnings, interpretedFrom } : { query, warnings };
}

function dwimQuery(raw: string): SearchIntent {
  if (!raw) return { query: "", warnings: [] };

  const hashTag = raw.match(/^#([\w.-]+)$/);
  if (hashTag?.[1]) {
    return { query: `tag:${hashTag[1]}`, warnings: [], interpretedFrom: raw };
  }

  const tagPhrase = raw.match(/^tags?\s+(.+)$/i);
  if (tagPhrase?.[1]) {
    return { query: `tag:${quoteIfNeeded(cleanValue(tagPhrase[1]))}`, warnings: [], interpretedFrom: raw };
  }

  const fromPhrase = raw.match(/^from\s+(.+)$/i);
  if (fromPhrase?.[1]) {
    return { query: `domain:${quoteIfNeeded(cleanValue(fromPhrase[1]))}`, warnings: [], interpretedFrom: raw };
  }

  const notesPhrase = raw.match(/^notes?\s+about\s+(.+)$/i);
  if (notesPhrase?.[1]) {
    return { query: `${cleanValue(notesPhrase[1])} && type:note`, warnings: [], interpretedFrom: raw };
  }

  const unreadPhrase = raw.match(/^unread(?:\s+(.+))?$/i);
  if (unreadPhrase) {
    const rest = cleanValue(unreadPhrase[1] ?? "");
    return {
      query: rest ? `${rest} && completed:false` : "completed:false",
      warnings: [],
      interpretedFrom: raw
    };
  }

  return { query: raw, warnings: [] };
}

function cleanValue(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "");
}

function quoteIfNeeded(value: string): string {
  return /\s/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
}
