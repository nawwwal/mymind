import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { MyMindClientInterface } from "../mymind/client-interface.js";
import type { SpaceCreateInput, SpaceUpdateInput } from "../mymind/client.js";
import { requireLiteralConfirm } from "./confirm.js";
import { dryRunResult, jsonResult } from "./mcp-result.js";

export async function mymindCreateSpaceAction(
  client: MyMindClientInterface,
  input: SpaceCreateInput & {
    dryRun?: boolean | undefined;
    confirmWrite?: true | undefined;
  }
): Promise<CallToolResult> {
  const { confirmWrite, dryRun, ...rest } = input;
  if (dryRun === true) {
    return dryRunResult("mymind_create_space", rest as Record<string, unknown>);
  }
  requireLiteralConfirm(confirmWrite, "Creating a space costs 100 credits.");
  return jsonResult(await client.createSpace(rest));
}

export async function mymindGetSpaceAction(client: MyMindClientInterface, id: string): Promise<CallToolResult> {
  return jsonResult(await client.getSpace(id));
}

export async function mymindListSpacesAction(client: MyMindClientInterface): Promise<CallToolResult> {
  return jsonResult(await client.listSpaces());
}

export async function mymindUpdateSpaceAction(
  client: MyMindClientInterface,
  input: {
    id: string;
    name?: string | undefined;
    color?: string | undefined;
    dryRun?: boolean | undefined;
    confirmWrite?: true | undefined;
  }
): Promise<CallToolResult> {
  const { id, confirmWrite, dryRun, ...patch } = input;
  if (dryRun === true) {
    return dryRunResult("mymind_update_space", { id, ...patch });
  }
  requireLiteralConfirm(confirmWrite, "Updating a space requires confirmation.");
  return jsonResult(await client.updateSpace(id, patch as SpaceUpdateInput));
}

export async function mymindDeleteSpaceAction(
  client: MyMindClientInterface,
  input: { id: string; dryRun?: boolean | undefined; confirmDelete?: true | undefined }
): Promise<CallToolResult> {
  const { id, confirmDelete, dryRun } = input;
  if (dryRun === true) {
    return dryRunResult("mymind_delete_space", { id });
  }
  requireLiteralConfirm(confirmDelete, "Deleting a space requires confirmDelete=true.");
  return jsonResult(await client.deleteSpace(id));
}

export async function mymindAddObjectToSpaceAction(
  client: MyMindClientInterface,
  input: {
    spaceId: string;
    objectId: string;
    dryRun?: boolean | undefined;
    confirmWrite?: true | undefined;
  }
): Promise<CallToolResult> {
  const { spaceId, objectId, confirmWrite, dryRun } = input;
  if (dryRun === true) {
    return dryRunResult("mymind_add_object_to_space", { spaceId, objectId });
  }
  requireLiteralConfirm(confirmWrite, "Adding object to space requires confirmation.");
  return jsonResult(await client.addObjectToSpace(spaceId, objectId));
}

export async function mymindRemoveObjectFromSpaceAction(
  client: MyMindClientInterface,
  input: {
    spaceId: string;
    objectId: string;
    dryRun?: boolean | undefined;
    confirmWrite?: true | undefined;
  }
): Promise<CallToolResult> {
  const { spaceId, objectId, confirmWrite, dryRun } = input;
  if (dryRun === true) {
    return dryRunResult("mymind_remove_object_from_space", { spaceId, objectId });
  }
  requireLiteralConfirm(confirmWrite, "Removing object from space requires confirmation.");
  return jsonResult(await client.removeObjectFromSpace(spaceId, objectId));
}
