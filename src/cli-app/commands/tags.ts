import { defineCommand } from "citty";
import { handleCliError, printEnvelope } from "../io.js";
import { parseOptionalLimit } from "../limits.js";
import { withClient } from "../run-client.js";

function parseTagFlag(raw: string | undefined): Record<string, number> | undefined {
  if (raw === undefined || raw === "" || raw === "all") return undefined;
  if (raw === "manual") return { flag: 2 };
  if (raw === "ai") return { flag: 8 };
  throw new Error('Invalid --flag (use manual | ai | all)');
}

const tagsLsCommand = defineCommand({
  meta: { name: "ls", description: "List tags" },
  args: {
    limit: { type: "string", description: "Max tags", valueHint: "n" },
    flag: {
      type: "enum",
      description: "Filter by tag origin bitmask",
      options: ["manual", "ai", "all"],
      default: "all"
    }
  },
  async run({ args }) {
    try {
      await withClient(async (client) => {
        const limit = parseOptionalLimit(args.limit);
        const flagQuery = parseTagFlag(args.flag as string | undefined);
        const query = { ...flagQuery, ...(limit !== undefined ? { limit } : {}) };
        const result = await client.listTags(query);
        printEnvelope("tags.ls", result.data, result.rateLimit);
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

export const tagsRootCommand = defineCommand({
  meta: { name: "tags", description: "Tag operations" },
  subCommands: {
    ls: tagsLsCommand
  }
});
