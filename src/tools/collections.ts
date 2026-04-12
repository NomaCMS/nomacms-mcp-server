import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NomaClient } from "../client.js";

export function registerCollectionTools(
  server: McpServer,
  client: NomaClient
): void {
  // ── list_collections ──────────────────────────────────────────────
  server.registerTool("list_collections", {
    title: "List Collections",
    description: "List all collections in the project",
  }, async () => {
    const result = await client.get("/collections");
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── get_collection ────────────────────────────────────────────────
  server.registerTool("get_collection", {
    title: "Get Collection",
    description:
      "Get a single collection with its full field schema by slug",
    inputSchema: {
      slug: z.string().describe("The collection slug (e.g. 'blog-posts')"),
    },
  }, async ({ slug }) => {
    const result = await client.get(`/collections/${slug}`);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── create_collection ─────────────────────────────────────────────
  server.registerTool("create_collection", {
    title: "Create Collection",
    description:
      "Create a new collection. Optionally include field definitions to create the collection with its full schema in a single request.",
    inputSchema: {
      name: z.string().describe("Display name (max 60 chars)"),
      slug: z
        .string()
        .describe("URL-friendly identifier, kebab-case (max 60 chars)"),
      is_singleton: z
        .boolean()
        .optional()
        .describe("If true, collection can only have one entry"),
      fields: z
        .array(
          z.object({
            type: z
              .string()
              .describe(
                "Field type: text, number, richtext, boolean, date, media, relation, select, longtext, group, etc."
              ),
            label: z.string().describe("Display label"),
            name: z.string().describe("Field identifier in kebab-case"),
            description: z.string().optional().describe("Field description"),
            placeholder: z.string().optional().describe("Placeholder text"),
            options: z
              .record(z.string(), z.unknown())
              .optional()
              .describe("Field-specific options (e.g. { repeatable: true } for group fields)"),
            validations: z
              .record(z.string(), z.unknown())
              .optional()
              .describe(
                "Validation rules (e.g. { required: { status: true, message: 'Required' } })"
              ),
            children: z
              .array(
                z.object({
                  type: z.string(),
                  label: z.string(),
                  name: z.string(),
                  description: z.string().optional(),
                  placeholder: z.string().optional(),
                  options: z.record(z.string(), z.unknown()).optional(),
                  validations: z.record(z.string(), z.unknown()).optional(),
                })
              )
              .optional()
              .describe("Child fields (only for group type)"),
          })
        )
        .optional()
        .describe("Array of field definitions to create with the collection"),
    },
  }, async ({ name, slug, is_singleton, fields }) => {
    const body: Record<string, unknown> = { name, slug };
    if (is_singleton !== undefined) body.is_singleton = is_singleton;
    if (fields) body.fields = fields;

    const result = await client.post("/collections", body);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── update_collection ─────────────────────────────────────────────
  server.registerTool("update_collection", {
    title: "Update Collection",
    description: "Update the name and slug of an existing collection",
    inputSchema: {
      slug: z.string().describe("Current slug of the collection to update"),
      name: z.string().describe("New display name"),
      new_slug: z.string().describe("New slug"),
    },
  }, async ({ slug, name, new_slug }) => {
    const result = await client.put(`/collections/${slug}`, {
      name,
      slug: new_slug,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── reorder_collections ───────────────────────────────────────────
  server.registerTool("reorder_collections", {
    title: "Reorder Collections",
    description: "Update the display order of collections",
    inputSchema: {
      collections: z
        .array(
          z.object({
            uuid: z.string().describe("Collection UUID"),
            order: z.number().describe("New display order (0-based)"),
          })
        )
        .describe("Array of { uuid, order } objects"),
    },
  }, async ({ collections }) => {
    const result = await client.post("/collections/reorder", { collections });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });
}
