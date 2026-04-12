import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NomaClient } from "../client.js";

export function registerFieldTools(
  server: McpServer,
  client: NomaClient
): void {
  // ── create_field ──────────────────────────────────────────────────
  server.registerTool("create_field", {
    title: "Create Field",
    description: "Add a new field to a collection",
    inputSchema: {
      collection_slug: z
        .string()
        .describe("The slug of the collection to add the field to"),
      type: z
        .string()
        .describe(
          "Field type: text, number, richtext, boolean, date, media, relation, select, longtext, group, etc."
        ),
      label: z.string().describe("Display label (max 60 chars)"),
      name: z
        .string()
        .describe("Field identifier in kebab-case (max 60 chars)"),
      description: z.string().optional().describe("Field description"),
      placeholder: z.string().optional().describe("Placeholder text"),
      options: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          "Field-specific options (e.g. { repeatable: true } for group fields). For richtext: { editor: { type: 1, outputFormat: 'html' | 'markdown' } }"
        ),
      validations: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          "Validation rules (e.g. { required: { status: true, message: 'Required' } })"
        ),
      parent_field_id: z
        .number()
        .optional()
        .describe(
          "Internal ID of a group field to nest this field under"
        ),
    },
  }, async ({ collection_slug, ...fieldData }) => {
    const result = await client.post(
      `/collections/${collection_slug}/fields`,
      fieldData
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── update_field ──────────────────────────────────────────────────
  server.registerTool("update_field", {
    title: "Update Field",
    description: "Update an existing field on a collection",
    inputSchema: {
      collection_slug: z.string().describe("The collection slug"),
      field_uuid: z.string().describe("The UUID of the field to update"),
      type: z.string().describe("Field type"),
      label: z.string().describe("Display label"),
      name: z.string().describe("Field identifier in kebab-case"),
      description: z.string().optional().describe("Field description"),
      placeholder: z.string().optional().describe("Placeholder text"),
      options: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          "Field-specific options. For richtext: { editor: { type: 1, outputFormat: 'html' | 'markdown' } }"
        ),
      validations: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Validation rules"),
    },
  }, async ({ collection_slug, field_uuid, ...fieldData }) => {
    const result = await client.put(
      `/collections/${collection_slug}/fields/${field_uuid}`,
      fieldData
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── reorder_fields ────────────────────────────────────────────────
  server.registerTool("reorder_fields", {
    title: "Reorder Fields",
    description: "Update the display order of fields within a collection",
    inputSchema: {
      collection_slug: z.string().describe("The collection slug"),
      fields: z
        .array(
          z.object({
            uuid: z.string().describe("Field UUID"),
            order: z.number().describe("New display order (0-based)"),
          })
        )
        .describe("Array of { uuid, order } objects"),
    },
  }, async ({ collection_slug, fields }) => {
    const result = await client.post(
      `/collections/${collection_slug}/fields/reorder`,
      { fields }
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });
}
