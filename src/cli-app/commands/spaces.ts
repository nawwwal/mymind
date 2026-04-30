import { defineCommand } from "citty";
import { assertLikelyCssColor } from "../color-validation.js";
import {
  handleCliError,
  printEnvelope,
  printListEnvelope,
  requireConfirm,
  requireConfirmDelete,
  exitDryRun
} from "../io.js";
import { readStdinLines } from "../stdin.js";
import { withClient } from "../run-client.js";

const spacesLsCommand = defineCommand({
  meta: { name: "ls", description: "List spaces" },
  async run() {
    try {
      await withClient(async (client) => {
        const result = await client.listSpaces();
        printListEnvelope("spaces.ls", result.data, result.rateLimit);
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const spacesGetCommand = defineCommand({
  meta: { name: "get", description: "Get space by id" },
  args: {
    id: { type: "positional", description: "Space uid", required: false }
  },
  async run({ args }) {
    try {
      const fromArg = args.id as string | undefined;
      const stdinIds = await readStdinLines();
      const ids = fromArg ? [fromArg, ...stdinIds] : stdinIds;
      if (ids.length === 0) throw new Error("Provide <id> or pipe ids on stdin");
      await withClient(async (client) => {
        for (const id of ids) {
          const result = await client.getSpace(id);
          printEnvelope("spaces.get", result.data, result.rateLimit);
        }
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const spacesCreateCommand = defineCommand({
  meta: { name: "create", description: "Create a space (costs credits)" },
  args: {
    name: { type: "positional", description: "Space name", required: true },
    color: { type: "string", description: "CSS color" },
    yesCost: { type: "boolean", description: "Confirm spend", alias: ["yes-cost"] },
    dryRun: { type: "boolean", description: "Preview only", alias: ["dry-run"] }
  },
  async run({ args }) {
    try {
      assertLikelyCssColor(args.color as string | undefined);
      if (args.dryRun === true) {
        exitDryRun("spaces.create", { name: args.name, color: args.color });
      }
      requireConfirm(
        args.yesCost,
        "Creating a space costs credits. Pass --yes-cost or MYMIND_AUTO_CONFIRM=1."
      );
      await withClient(async (client) => {
        const result = await client.createSpace({
          name: args.name as string,
          color: args.color as string | undefined
        });
        printEnvelope("spaces.create", result.data, result.rateLimit);
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const spacesUpdateCommand = defineCommand({
  meta: { name: "update", description: "Update space metadata" },
  args: {
    id: { type: "positional", description: "Space uid", required: true },
    name: { type: "string", description: "New name" },
    color: { type: "string", description: "CSS color" },
    yes: { type: "boolean", description: "Confirm write", alias: ["y"] },
    dryRun: { type: "boolean", description: "Preview only", alias: ["dry-run"] }
  },
  async run({ args }) {
    try {
      assertLikelyCssColor(args.color as string | undefined);
      if (args.dryRun === true) {
        exitDryRun("spaces.update", { id: args.id, name: args.name, color: args.color });
      }
      requireConfirm(args.yes, "Updating a space requires --yes or MYMIND_AUTO_CONFIRM=1.");
      await withClient(async (client) => {
        const result = await client.updateSpace(args.id as string, {
          name: args.name as string | undefined,
          color: args.color as string | undefined
        });
        printEnvelope("spaces.update", result.data, result.rateLimit);
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const spacesRmCommand = defineCommand({
  meta: { name: "rm", description: "Delete a space (objects remain)" },
  args: {
    id: { type: "positional", description: "Space uid", required: true },
    yes: { type: "boolean", alias: ["y"] },
    yesDelete: { type: "boolean", alias: ["yes-delete"] },
    dryRun: { type: "boolean", alias: ["dry-run"] }
  },
  async run({ args }) {
    try {
      if (args.dryRun === true) {
        exitDryRun("spaces.rm", { id: args.id });
      }
      requireConfirmDelete(
        args.yes,
        args.yesDelete,
        "Deleting a space requires both --yes and --yes-delete (or MYMIND_AUTO_CONFIRM=1)."
      );
      await withClient(async (client) => {
        const result = await client.deleteSpace(args.id as string);
        printEnvelope("spaces.rm", result.data, result.rateLimit);
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const spacesAddCommand = defineCommand({
  meta: { name: "add", description: "Add object to space" },
  args: {
    spaceId: { type: "string", description: "Space uid", required: true, alias: ["space"] },
    objectId: { type: "positional", description: "Object uid", required: false },
    yes: { type: "boolean", alias: ["y"] },
    dryRun: { type: "boolean", alias: ["dry-run"] }
  },
  async run({ args }) {
    try {
      const sid = args.spaceId as string;
      const fromArg = args.objectId as string | undefined;
      const stdinIds = await readStdinLines();
      const oids = fromArg ? [fromArg, ...stdinIds] : stdinIds;
      if (oids.length === 0) throw new Error("Provide <objectId> or pipe object ids on stdin");
      if (args.dryRun === true) {
        exitDryRun("spaces.add", { spaceId: sid, objectIds: oids });
      }
      requireConfirm(args.yes, "Adding objects to a space requires --yes or MYMIND_AUTO_CONFIRM=1.");
      await withClient(async (client) => {
        for (const oid of oids) {
          const result = await client.addObjectToSpace(sid, oid);
          printEnvelope("spaces.add", result.data, result.rateLimit);
        }
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

const spacesRemoveCommand = defineCommand({
  meta: { name: "remove", description: "Remove object from space" },
  args: {
    spaceId: { type: "string", description: "Space uid", required: true, alias: ["space"] },
    objectId: { type: "positional", description: "Object uid", required: false },
    yes: { type: "boolean", alias: ["y"] },
    dryRun: { type: "boolean", alias: ["dry-run"] }
  },
  async run({ args }) {
    try {
      const sid = args.spaceId as string;
      const fromArg = args.objectId as string | undefined;
      const stdinIds = await readStdinLines();
      const oids = fromArg ? [fromArg, ...stdinIds] : stdinIds;
      if (oids.length === 0) throw new Error("Provide <objectId> or pipe object ids on stdin");
      if (args.dryRun === true) {
        exitDryRun("spaces.remove", { spaceId: sid, objectIds: oids });
      }
      requireConfirm(args.yes, "Removing objects from a space requires --yes or MYMIND_AUTO_CONFIRM=1.");
      await withClient(async (client) => {
        for (const oid of oids) {
          const result = await client.removeObjectFromSpace(sid, oid);
          printEnvelope("spaces.remove", result.data, result.rateLimit);
        }
      });
    } catch (error) {
      handleCliError(error);
    }
  }
});

export const spacesRootCommand = defineCommand({
  meta: { name: "spaces", description: "Space operations" },
  subCommands: {
    ls: spacesLsCommand,
    get: spacesGetCommand,
    create: spacesCreateCommand,
    update: spacesUpdateCommand,
    rm: spacesRmCommand,
    add: spacesAddCommand,
    remove: spacesRemoveCommand
  }
});
