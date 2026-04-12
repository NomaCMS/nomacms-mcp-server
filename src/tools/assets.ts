import { z } from "zod";
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NomaClient } from "../client.js";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".zip": "application/zip",
  ".json": "application/json",
  ".txt": "text/plain",
  ".csv": "text/csv",
};

function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

export function registerAssetTools(
  server: McpServer,
  client: NomaClient
): void {
  // ── list_assets ───────────────────────────────────────────────────
  server.registerTool("list_assets", {
    title: "List Assets",
    description:
      "List assets in the project with optional pagination.",
    inputSchema: {
      page: z.number().optional().describe("Page number"),
      paginate: z.number().optional().describe("Items per page"),
      per_page: z.number().optional().describe("Deprecated alias for paginate"),
    },
  }, async ({ page, paginate, per_page }) => {
    const params: Record<string, string> = {};
    if (page) params.page = String(page);
    const resolvedPaginate = paginate ?? per_page;
    if (resolvedPaginate) params.paginate = String(resolvedPaginate);

    const result = await client.get("/files", params);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── get_asset ─────────────────────────────────────────────────────
  server.registerTool("get_asset", {
    title: "Get Asset",
    description:
      "Get an asset by its UUID or by filename.",
    inputSchema: {
      identifier: z
        .string()
        .describe("Asset UUID or filename"),
      by_name: z
        .boolean()
        .optional()
        .describe("If true, looks up by filename instead of UUID"),
    },
  }, async ({ identifier, by_name }) => {
    const path = by_name
      ? `/files/name/${identifier}`
      : `/files/${identifier}`;
    const result = await client.get(path);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── upload_asset ──────────────────────────────────────────────────
  server.registerTool("upload_asset", {
    title: "Upload Asset",
    description:
      "Upload a local file as an asset. Provide the absolute file path.",
    inputSchema: {
      file_path: z
        .string()
        .describe("Absolute path to the file to upload"),
    },
  }, async ({ file_path }) => {
    const fileBuffer = await readFile(file_path);
    const filename = basename(file_path);
    const mimeType = getMimeType(file_path);

    const result = await client.uploadFile(
      "/files",
      fileBuffer,
      filename,
      mimeType
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── bulk_upload_assets ─────────────────────────────────────────────
  server.registerTool("bulk_upload_assets", {
    title: "Bulk Upload Assets",
    description:
      "Upload multiple local files as assets atomically. If one upload fails, all uploads are rolled back.",
    inputSchema: {
      file_paths: z
        .array(z.string())
        .min(1)
        .describe("Absolute file paths to upload"),
    },
  }, async ({ file_paths }) => {
    const files = await Promise.all(
      file_paths.map(async (filePath) => ({
        fileBuffer: await readFile(filePath),
        filename: basename(filePath),
        mimeType: getMimeType(filePath),
      }))
    );

    const result = await client.uploadFiles("/files/bulk/upload", files);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── bulk_update_asset_metadata ─────────────────────────────────────
  server.registerTool("bulk_update_asset_metadata", {
    title: "Bulk Update Asset Metadata",
    description:
      "Update metadata for multiple assets atomically by UUID. If one item fails, all updates are rolled back.",
    inputSchema: {
      items: z
        .array(
          z.object({
            uuid: z.string().describe("Asset UUID"),
            alt_text: z.string().optional().describe("Alternative text"),
            title: z.string().optional().describe("Title"),
            caption: z.string().optional().describe("Caption"),
            description: z.string().optional().describe("Description"),
            author: z.string().optional().describe("Author"),
            copyright: z.string().optional().describe("Copyright"),
          })
        )
        .min(1)
        .describe("Array of metadata updates"),
    },
  }, async ({ items }) => {
    const result = await client.patch("/files/bulk/metadata", { items });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── delete_asset ──────────────────────────────────────────────────
  server.registerTool("delete_asset", {
    title: "Delete Asset",
    description: "Delete an asset by UUID",
    inputSchema: {
      uuid: z.string().describe("The asset UUID"),
    },
  }, async ({ uuid }) => {
    const result = await client.delete(`/files/${uuid}`);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });
}
