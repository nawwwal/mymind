import { z } from "zod";

export const searchMymindPromptArgsSchema = z
  .object({
    query: z.string().describe("What to recall from MyMind."),
    useSemantic: z.string().optional().describe("Set to true when semantic search is useful.")
  })
  .strict();

export const summarizeMymindObjectPromptArgsSchema = z
  .object({
    id: z.string().describe("MyMind object ID."),
    format: z.string().optional().describe("markdown, html, or prose.")
  })
  .strict();

export const saveToMymindPromptArgsSchema = z
  .object({
    source: z.string().describe("URL or note content to save."),
    kind: z.string().describe("url or note.")
  })
  .strict();

export const organizeMymindObjectPromptArgsSchema = z
  .object({
    id: z.string().describe("Object ID to organize.")
  })
  .strict();

export const MYMIND_PROMPT_ARG_SCHEMAS = {
  search_mymind: searchMymindPromptArgsSchema,
  summarize_mymind_object: summarizeMymindObjectPromptArgsSchema,
  save_to_mymind: saveToMymindPromptArgsSchema,
  organize_mymind_object: organizeMymindObjectPromptArgsSchema
} as const;
