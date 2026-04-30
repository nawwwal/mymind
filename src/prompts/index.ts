import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  organizeMymindObjectPromptArgsSchema,
  saveToMymindPromptArgsSchema,
  searchMymindPromptArgsSchema,
  summarizeMymindObjectPromptArgsSchema
} from "../schemas/prompt-args.js";

export function registerMymindPrompts(server: McpServer): void {
  server.registerPrompt(
    "search_mymind",
    {
      title: "Search MyMind",
      description: "Turn a recall request into a MyMind search and synthesis workflow.",
      argsSchema: searchMymindPromptArgsSchema.shape
    },
    ({ query, useSemantic }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Search MyMind for: ${query}\nCall mymind_search_objects with q set to the query and semantic=${useSemantic === "true" ? "true" : "false"}. If semantic or rerank is enabled, include confirmHighCost=true. Then fetch the most relevant records with mymind_get_object before answering.`
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "summarize_mymind_object",
    {
      title: "Summarize MyMind object",
      description: "Fetch and summarize one saved object.",
      argsSchema: summarizeMymindObjectPromptArgsSchema.shape
    },
    ({ id, format }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Fetch object ${id} with mymind_get_object. If it is text-based, call mymind_get_object_content with id=${id} and format=${format ?? "text/markdown"}. Summarize the object and cite the object ID.`
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "save_to_mymind",
    {
      title: "Save to MyMind",
      description: "Prepare a safe create-object call.",
      argsSchema: saveToMymindPromptArgsSchema.shape
    },
    ({ source, kind }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Prepare a mymind_create_object call for this ${kind}: ${source}\nFirst preview it with dryRun=true. Only make the live call after explicit approval, and include confirmHighCost=true because object creation consumes credits.`
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "organize_mymind_object",
    {
      title: "Organize MyMind object",
      description: "Suggest tags/spaces before mutating MyMind.",
      argsSchema: organizeMymindObjectPromptArgsSchema.shape
    },
    ({ id }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Inspect MyMind object ${id} with mymind_get_object, suggest useful tags or spaces, and preview writes with dryRun=true before using mymind_add_object_tags, mymind_add_object_spaces, or mymind_add_object_to_space with confirmWrite=true.`
          }
        }
      ]
    })
  );
}
