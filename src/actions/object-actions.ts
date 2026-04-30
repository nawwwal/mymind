import { stat, writeFile } from "node:fs/promises";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { MymindMcpConfig } from "../config.js";
import type { MyMindClient } from "../mymind/index.js";
import type { ObjectCreateInput, ObjectUpdateInput } from "../mymind/client.js";
import { requireLiteralConfirm } from "./confirm.js";
import { dryRunResult, jsonContent, jsonResult, summarizeContent } from "./mcp-result.js";
import { assertAllowedPath, assertOutputPath } from "./paths.js";

export async function mymindListObjectsAction(
  client: MyMindClient,
  input: { id?: string[] | undefined; limit?: number | undefined }
): Promise<CallToolResult> {
  return jsonResult(await client.listObjects({ id: input.id, limit: input.limit }));
}

export async function mymindCreateObjectAction(
  client: MyMindClient,
  config: MymindMcpConfig,
  input: ObjectCreateInput & {
    filePath?: string | undefined;
    mimeType?: string | undefined;
    confirmHighCost?: true | undefined;
    dryRun?: boolean | undefined;
  }
): Promise<CallToolResult> {
  const { filePath, mimeType, confirmHighCost, dryRun, ...rest } = input;
  const provided = [rest.url, rest.content, filePath].filter((value) => value !== undefined).length;
  if (provided !== 1) {
    throw new Error("Provide exactly one of url, content, or filePath.");
  }
  if (filePath !== undefined) {
    const uploadPath = await assertAllowedPath(filePath, config.allowedFileRoots);
    const stats = await stat(uploadPath);
    if (!stats.isFile()) {
      throw new Error(`Upload path is not a file: ${filePath}`);
    }
    if (stats.size > 64 * 1024 * 1024) {
      throw new Error("MyMind uploads are capped at 64 MB.");
    }
    if (dryRun === true) {
      return dryRunResult("mymind_create_object", {
        ...rest,
        filePath: uploadPath,
        mimeType,
        fileSize: stats.size
      });
    }
    requireLiteralConfirm(confirmHighCost, "Creating objects can cost up to 250 credits.");
    return jsonResult(await client.createObjectFromFile(uploadPath, { ...rest, mimeType }));
  }
  if (dryRun === true) {
    return dryRunResult("mymind_create_object", rest as Record<string, unknown>);
  }
  requireLiteralConfirm(confirmHighCost, "Creating objects can cost up to 250 credits.");
  return jsonResult(await client.createObject(rest));
}

export async function mymindGetObjectAction(client: MyMindClient, id: string): Promise<CallToolResult> {
  return jsonResult(await client.getObject(id));
}

export async function mymindFindRelatedObjectsAction(
  client: MyMindClient,
  input: { id: string; limit?: number | undefined; confirmHighCost: true }
): Promise<CallToolResult> {
  requireLiteralConfirm(
    input.confirmHighCost,
    "Related-object search costs 100 credits and may require Mastermind."
  );
  return jsonResult(await client.findRelatedObjects(input.id, { limit: input.limit }));
}

export async function mymindDownloadObjectAction(
  client: MyMindClient,
  config: MymindMcpConfig,
  input: {
    id: string;
    outputFilename?: string | undefined;
    dryRun?: boolean | undefined;
    confirmWrite?: true | undefined;
  }
): Promise<CallToolResult> {
  const { id, outputFilename, dryRun, confirmWrite } = input;
  if (outputFilename !== undefined) {
    if (!config.outputDir) {
      throw new Error("Set MYMIND_OUTPUT_DIR to save downloads.");
    }
    const outputPath = await assertOutputPath(config.outputDir, outputFilename, {
      createDirectory: dryRun !== true
    });
    if (dryRun === true) {
      return dryRunResult("mymind_download_object", {
        id,
        outputFilename,
        outputPath,
        outputDir: config.outputDir
      });
    }
    requireLiteralConfirm(confirmWrite, "Writing a download requires confirmWrite=true.");
    const raw = await client.requestRaw({ path: `/objects/${encodeURIComponent(id)}/blob`, accept: "*/*" });
    await writeFile(outputPath, Buffer.from(await raw.response.arrayBuffer()));
    return jsonContent({
      path: outputPath,
      contentType: raw.response.headers.get("Content-Type"),
      rateLimit: raw.rateLimit
    });
  }
  if (dryRun === true) {
    return dryRunResult("mymind_download_object", { id, mode: "inline" });
  }
  const raw = await client.requestRaw({ path: `/objects/${encodeURIComponent(id)}/blob`, accept: "*/*" });
  const contentType = raw.response.headers.get("Content-Type") ?? "application/octet-stream";
  if (!contentType.startsWith("text/") && !contentType.includes("json")) {
    return jsonContent({
      contentType,
      message:
        "Binary response not returned inline. Provide outputFilename and set MYMIND_OUTPUT_DIR to save it.",
      rateLimit: raw.rateLimit
    });
  }
  return jsonContent({
    content: await raw.response.text(),
    contentType,
    rateLimit: raw.rateLimit
  });
}

export async function mymindGetObjectContentAction(
  client: MyMindClient,
  id: string,
  format: "text/markdown" | "application/prose+json" | "text/html"
): Promise<CallToolResult> {
  return jsonResult(await client.getObjectContent(id, format));
}

export async function mymindUpdateObjectAction(
  client: MyMindClient,
  input: {
    id: string;
    title?: string | undefined;
    dryRun?: boolean | undefined;
    confirmWrite?: true | undefined;
  }
): Promise<CallToolResult> {
  const { id, confirmWrite, dryRun, ...patch } = input;
  if (dryRun === true) {
    return dryRunResult("mymind_update_object", { id, ...patch });
  }
  requireLiteralConfirm(confirmWrite, "Updating object metadata requires confirmation.");
  return jsonResult(await client.updateObject(id, patch as ObjectUpdateInput));
}

export async function mymindReplaceNoteContentAction(
  client: MyMindClient,
  input: {
    id: string;
    content: string | Record<string, unknown>;
    contentType: "text/markdown" | "application/prose+json";
    confirmReplace?: true | undefined;
    dryRun?: boolean | undefined;
  }
): Promise<CallToolResult> {
  const { id, content, contentType, confirmReplace, dryRun } = input;
  if (dryRun === true) {
    return dryRunResult("mymind_replace_note_content", {
      id,
      contentType,
      content: summarizeContent(content)
    });
  }
  requireLiteralConfirm(confirmReplace, "Replacing note content is destructive.");
  return jsonResult(await client.replaceObjectContent(id, content, contentType));
}

export async function mymindAddObjectTagsAction(
  client: MyMindClient,
  input: {
    objectId: string;
    tags: Array<{ name: string; flags?: number | undefined }>;
    dryRun?: boolean | undefined;
    confirmWrite?: true | undefined;
  }
): Promise<CallToolResult> {
  const { objectId, tags, confirmWrite, dryRun } = input;
  if (dryRun === true) {
    return dryRunResult("mymind_add_object_tags", { objectId, tags });
  }
  requireLiteralConfirm(confirmWrite, "Adding tags requires confirmation.");
  return jsonResult(await client.addObjectTags(objectId, tags));
}

export async function mymindAddObjectSpacesAction(
  client: MyMindClient,
  input: {
    objectId: string;
    spaces: Array<{ id: string }>;
    dryRun?: boolean | undefined;
    confirmWrite?: true | undefined;
  }
): Promise<CallToolResult> {
  const { objectId, spaces, confirmWrite, dryRun } = input;
  if (dryRun === true) {
    return dryRunResult("mymind_add_object_spaces", { objectId, spaces });
  }
  requireLiteralConfirm(confirmWrite, "Adding spaces requires confirmation.");
  return jsonResult(await client.addObjectSpaces(objectId, spaces));
}

export async function mymindPinObjectAction(
  client: MyMindClient,
  input: {
    id: string;
    position?: number | undefined;
    dryRun?: boolean | undefined;
    confirmWrite?: true | undefined;
  }
): Promise<CallToolResult> {
  const { id, position, confirmWrite, dryRun } = input;
  if (dryRun === true) {
    return dryRunResult("mymind_pin_object", { id, position });
  }
  requireLiteralConfirm(confirmWrite, "Pinning requires confirmation.");
  return jsonResult(await client.pinObject(id, position));
}

export async function mymindUnpinObjectAction(
  client: MyMindClient,
  input: { id: string; dryRun?: boolean | undefined; confirmWrite?: true | undefined }
): Promise<CallToolResult> {
  const { id, confirmWrite, dryRun } = input;
  if (dryRun === true) {
    return dryRunResult("mymind_unpin_object", { id });
  }
  requireLiteralConfirm(confirmWrite, "Unpinning requires confirmation.");
  return jsonResult(await client.unpinObject(id));
}

export async function mymindDeleteObjectAction(
  client: MyMindClient,
  input: { id: string; dryRun?: boolean | undefined; confirmDelete?: true | undefined }
): Promise<CallToolResult> {
  const { id, confirmDelete, dryRun } = input;
  if (dryRun === true) {
    return dryRunResult("mymind_delete_object", { id });
  }
  requireLiteralConfirm(confirmDelete, "Deleting an object requires confirmDelete=true.");
  return jsonResult(await client.deleteObject(id));
}

export async function mymindRestoreObjectAction(
  client: MyMindClient,
  input: { id: string; dryRun?: boolean | undefined; confirmWrite?: true | undefined }
): Promise<CallToolResult> {
  const { id, confirmWrite, dryRun } = input;
  if (dryRun === true) {
    return dryRunResult("mymind_restore_object", { id });
  }
  requireLiteralConfirm(confirmWrite, "Restoring requires confirmation.");
  return jsonResult(await client.restoreObject(id));
}
