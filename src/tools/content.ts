import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NomaClient } from "../client.js";

/** Appended to `data` payload docs — must match Content API (UUID/id only on write). */
const DATA_RELATION_AND_MEDIA_HINT =
  " Relation fields: on write send the related entry's UUID string or numeric id only; one-to-one = one value, one-to-many = array of UUIDs/ids. " +
  "Do not pass the nested entry object from get_entry/list_entries. " +
  "Media fields: asset UUID strings and/or numeric asset ids (array when multiple).";

export function registerContentTools(
  server: McpServer,
  client: NomaClient
): void {
  // ── list_entries ──────────────────────────────────────────────────
  server.registerTool("list_entries", {
    title: "List Entries",
    description:
      "List content entries for a collection with advanced filtering, sorting, and pagination. " +
      "Use the 'where' parameter for powerful queries. Read the 'query-reference' resource for full documentation on operators and examples.",
    inputSchema: {
      collection_slug: z.string().describe("The collection slug"),
      where: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          "Filter conditions as a nested object. Supports operators: eq, lt, lte, gt, gte, not, like, in, not_in, null, not_null, between, not_between. " +
          "Simple: { \"state\": \"published\" }. " +
          "With operators: { \"price\": { \"lt\": 50 }, \"title\": { \"like\": \"news\" } }. " +
          "OR group: { \"or\": [{ \"tags\": \"clearance\" }, { \"campaign\": { \"name\": \"Summer\" } }] }. " +
          "Relation filter: outer key = relation field on this collection; inner keys = field names on the related entry, e.g. { \"author\": { \"name\": { \"eq\": \"John\" } } }. " +
          "Core columns (id, uuid, locale, state, created_at, updated_at, published_at) can be filtered directly."
        ),
      locale: z
        .string()
        .optional()
        .describe("Filter by locale (e.g. 'en')"),
      state: z
        .string()
        .optional()
        .describe("Filter by state: 'draft' or 'published'. Defaults to published entries."),
      sort: z
        .string()
        .optional()
        .describe(
          "Sort by field:direction, comma-separated for multiple. " +
          "Examples: 'created_at:desc', 'title:asc,created_at:desc'. " +
          "Supports core columns (id, created_at, updated_at, published_at) and custom field names."
        ),
      paginate: z
        .number()
        .optional()
        .describe("Enable pagination with N items per page. Returns paginated response with meta data. Overrides limit/offset."),
      limit: z
        .number()
        .optional()
        .describe("Limit the number of results (ignored if paginate is set)"),
      offset: z
        .number()
        .optional()
        .describe("Skip N results (requires limit to be set)"),
      first: z
        .boolean()
        .optional()
        .describe("If true, return only the first matching entry as a single object instead of an array"),
      count: z
        .boolean()
        .optional()
        .describe("If true, return only the count of matching entries: { count: N }"),
      exclude: z
        .string()
        .optional()
        .describe("Comma-separated field names to exclude from response (e.g. 'content,excerpt')"),
    },
  }, async ({ collection_slug, where, locale, state, sort, paginate, limit, offset, first, count, exclude }) => {
    const params: Record<string, unknown> = {};
    if (locale) params.locale = locale;
    if (state) params.state = state;
    if (sort) params.sort = sort;
    if (paginate) params.paginate = paginate;
    if (limit) params.limit = limit;
    if (offset) params.offset = offset;
    if (first) params.first = 1;
    if (count) params.count = 1;
    if (exclude) params.exclude = exclude;

    // Pass where as a nested object — the client will flatten to bracket notation
    if (where) {
      params.where = where;
    }

    const result = await client.get(`/${collection_slug}`, params);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── get_entry ─────────────────────────────────────────────────────
  server.registerTool("get_entry", {
    title: "Get Entry",
    description:
      "Get a single content entry by UUID. Response includes uuid, locale, published_at, and a `fields` object (custom field values — not a nested `data` key). " +
      "Relation fields appear as nested entry objects (one-to-one) or arrays of entries (one-to-many), not as bare UUIDs.",
    inputSchema: {
      collection_slug: z.string().describe("The collection slug"),
      uuid: z.string().describe("The entry UUID"),
      locale: z.string().optional().describe("Locale code for the entry to load"),
      translation_locale: z
        .string()
        .optional()
        .describe(
          "If set, return the linked translation in this locale instead of the entry identified by uuid (same translation group)."
        ),
      state: z
        .string()
        .optional()
        .describe("draft or published"),
      exclude: z
        .string()
        .optional()
        .describe("Comma-separated field names to exclude from `fields` (e.g. 'body,excerpt')"),
      timestamps: z
        .boolean()
        .optional()
        .describe("If true, include created_at and updated_at on the entry"),
    },
  }, async ({ collection_slug, uuid, locale, translation_locale, state, exclude, timestamps }) => {
    const params: Record<string, unknown> = {};
    if (locale) params.locale = locale;
    if (translation_locale) params.translation_locale = translation_locale;
    if (state) params.state = state;
    if (exclude) params.exclude = exclude;
    if (timestamps === true) params.timestamps = true;

    const result = await client.get(`/${collection_slug}/${uuid}`, params);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── create_entry ──────────────────────────────────────────────────
  server.registerTool("create_entry", {
    title: "Create Entry",
    description: "Create a new content entry in a collection",
    inputSchema: {
      collection_slug: z.string().describe("The collection slug"),
      data: z
        .record(z.string(), z.unknown())
        .describe(
          "Object where keys are field names and values are the content (e.g. { title: 'My Post', slug: 'my-post' }). " +
            "Richtext fields: use a markdown string, not Lexical/HTML objects." +
            DATA_RELATION_AND_MEDIA_HINT
        ),
      state: z
        .string()
        .optional()
        .describe("Publication state: 'published' or 'draft' (default)"),
      status: z
        .string()
        .optional()
        .describe("Deprecated alias for state: 'published' or 'draft'"),
      locale: z.string().optional().describe("Locale code (e.g. 'en')"),
    },
  }, async ({ collection_slug, data, state, status, locale }) => {
    const body: Record<string, unknown> = { data };
    const resolvedState = state ?? status;
    if (resolvedState) body.state = resolvedState;
    if (locale) body.locale = locale;

    const result = await client.post(`/${collection_slug}`, body);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── update_entry ──────────────────────────────────────────────────
  server.registerTool("update_entry", {
    title: "Update Entry",
    description:
      "Replace an existing content entry (HTTP PUT). Sends the full `data` payload; required fields (e.g. title, slug) must be included. " +
      "Saves NEVER change the publish state — if the entry has a published version, the public API keeps serving that snapshot under state=published until you explicitly call `publish_entry`. " +
      "Use `patch_entry` for partial updates and `publish_entry`/`unpublish_entry` to control visibility.",
    inputSchema: {
      collection_slug: z.string().describe("The collection slug"),
      uuid: z.string().describe("The entry UUID"),
      data: z
        .record(z.string(), z.unknown())
        .describe(
          "Object with field names and their new values; richtext fields are markdown strings." +
            DATA_RELATION_AND_MEDIA_HINT
        ),
      locale: z.string().optional().describe("Locale code"),
    },
  }, async ({ collection_slug, uuid, data, locale }) => {
    const body: Record<string, unknown> = { data };
    if (locale) body.locale = locale;

    const result = await client.put(`/${collection_slug}/${uuid}`, body);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── patch_entry ───────────────────────────────────────────────────
  server.registerTool("patch_entry", {
    title: "Patch Entry",
    description:
      "Partially update a content entry (HTTP PATCH). Only include fields you want to change (e.g. relations, one field). " +
      "Saves NEVER change the publish state — call `publish_entry` explicitly to mint a new version. " +
      "Prefer this over `update_entry` when you are not replacing the entire entry.",
    inputSchema: {
      collection_slug: z.string().describe("The collection slug"),
      uuid: z.string().describe("The entry UUID"),
      data: z
        .record(z.string(), z.unknown())
        .describe(
          "Fields to merge; omit unchanged fields. Richtext values are markdown strings." +
            DATA_RELATION_AND_MEDIA_HINT
        ),
      locale: z.string().optional().describe("Locale code"),
    },
  }, async ({ collection_slug, uuid, data, locale }) => {
    const body: Record<string, unknown> = { data };
    if (locale) body.locale = locale;

    const result = await client.patch(`/${collection_slug}/${uuid}`, body);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── publish_entry ─────────────────────────────────────────────────
  server.registerTool("publish_entry", {
    title: "Publish Entry",
    description:
      "Mint a new immutable version from the entry's current draft and make it the live published version. " +
      "After this call, state=published reads from the public API will return the new snapshot and `is_draft_dirty` is reset to false.",
    inputSchema: {
      collection_slug: z.string().describe("The collection slug"),
      uuid: z.string().describe("The entry UUID"),
    },
  }, async ({ collection_slug, uuid }) => {
    const result = await client.post(`/${collection_slug}/${uuid}/publish`, {});
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── unpublish_entry ───────────────────────────────────────────────
  server.registerTool("unpublish_entry", {
    title: "Unpublish Entry",
    description:
      "Clear the live published pointer for an entry. The entry becomes invisible under state=published in the public API, but all historical versions are retained and still accessible via `list_entry_versions` / `get_entry_version`.",
    inputSchema: {
      collection_slug: z.string().describe("The collection slug"),
      uuid: z.string().describe("The entry UUID"),
    },
  }, async ({ collection_slug, uuid }) => {
    const result = await client.post(`/${collection_slug}/${uuid}/unpublish`, {});
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── delete_entry ──────────────────────────────────────────────────
  server.registerTool("delete_entry", {
    title: "Delete Entry",
    description:
      "Soft-delete a content entry (moves to trash). Can be restored from the admin panel.",
    inputSchema: {
      collection_slug: z.string().describe("The collection slug"),
      uuid: z.string().describe("The entry UUID"),
    },
  }, async ({ collection_slug, uuid }) => {
    const result = await client.delete(`/${collection_slug}/${uuid}`);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── link_entry_translation ────────────────────────────────────────
  server.registerTool("link_entry_translation", {
    title: "Link Entry Translation",
    description:
      "Merge two entries in the same collection into one translation group (same as dashboard “link translation”). " +
      "Both entries must exist, belong to this collection, and have **different** locales. " +
      "There is no unlink via API — use the dashboard if you need to split a group. " +
      "Requires an API key with **update** ability.",
    inputSchema: {
      collection_slug: z.string().describe("The collection slug"),
      uuid: z
        .string()
        .describe("UUID of the first entry (the “anchor”; both entries are merged into one translation group)"),
      translation_entry_uuid: z
        .string()
        .uuid()
        .describe("UUID of the second entry to link (must be a different locale than the first)"),
    },
  }, async ({ collection_slug, uuid, translation_entry_uuid }) => {
    const result = await client.post(`/${collection_slug}/${uuid}/link-translation`, {
      translation_entry_uuid,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── bulk_create_entries ────────────────────────────────────────────
  server.registerTool("bulk_create_entries", {
    title: "Bulk Create Entries",
    description:
      "Create multiple content entries atomically. If one item fails, the whole request is rolled back.",
    inputSchema: {
      collection_slug: z.string().describe("The collection slug"),
      items: z
        .array(
          z.object({
            data: z
              .record(z.string(), z.unknown())
              .describe(
                "Entry field payload; richtext values are markdown strings." +
                  DATA_RELATION_AND_MEDIA_HINT
              ),
            locale: z.string().optional().describe("Locale code (e.g. 'en')"),
            state: z
              .string()
              .optional()
              .describe("Publication state: 'published' or 'draft'"),
          })
        )
        .min(1)
        .describe("Array of entries to create"),
    },
  }, async ({ collection_slug, items }) => {
    const result = await client.post(`/bulk/${collection_slug}/entries`, { items });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── bulk_update_entries ────────────────────────────────────────────
  server.registerTool("bulk_update_entries", {
    title: "Bulk Update Entries",
    description:
      "Update multiple content entries atomically by UUID. If one item fails, all updates are rolled back. " +
      "Saves never change publish state — call `publish_entry` per UUID to mint new versions after bulk updates.",
    inputSchema: {
      collection_slug: z.string().describe("The collection slug"),
      items: z
        .array(
          z.object({
            uuid: z.string().describe("Entry UUID"),
            data: z
              .record(z.string(), z.unknown())
              .describe(
                "Entry field payload; richtext values are markdown strings." +
                  DATA_RELATION_AND_MEDIA_HINT
              ),
            locale: z.string().optional().describe("Locale code"),
          })
        )
        .min(1)
        .describe("Array of entries to update"),
    },
  }, async ({ collection_slug, items }) => {
    const result = await client.patch(`/bulk/${collection_slug}/entries`, { items });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── bulk_delete_entries ────────────────────────────────────────────
  server.registerTool("bulk_delete_entries", {
    title: "Bulk Delete Entries",
    description:
      "Delete multiple content entries atomically by UUID. If one delete fails, no entries are deleted.",
    inputSchema: {
      collection_slug: z.string().describe("The collection slug"),
      uuids: z.array(z.string()).min(1).describe("Entry UUIDs to delete"),
      force: z
        .boolean()
        .optional()
        .describe("If true, permanently delete instead of soft-delete"),
    },
  }, async ({ collection_slug, uuids, force }) => {
    const body: Record<string, unknown> = { uuids };
    if (typeof force === "boolean") {
      body.force = force;
    }

    const result = await client.delete(`/bulk/${collection_slug}/entries`, body);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── list_entry_versions ───────────────────────────────────────────
  server.registerTool("list_entry_versions", {
    title: "List Entry Versions",
    description:
      "List all published versions for a content entry (newest first). Each version is an immutable snapshot taken at publish time. " +
      "Response includes version_number, label, description, published_at, created_by, and is_current_published for each version.",
    inputSchema: {
      collection_slug: z.string().describe("The collection slug"),
      uuid: z.string().describe("The entry UUID"),
    },
  }, async ({ collection_slug, uuid }) => {
    const result = await client.get(`/${collection_slug}/${uuid}/versions`);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── get_entry_version ─────────────────────────────────────────────
  server.registerTool("get_entry_version", {
    title: "Get Entry Version",
    description:
      "Fetch a single version's metadata and raw snapshot payload. The snapshot contains the saved field values in restoration format; for API-rendered content use `get_entry` with state='published'.",
    inputSchema: {
      collection_slug: z.string().describe("The collection slug"),
      uuid: z.string().describe("The entry UUID"),
      version_number: z.number().int().positive().describe("The version number (1-based)"),
    },
  }, async ({ collection_slug, uuid, version_number }) => {
    const result = await client.get(`/${collection_slug}/${uuid}/versions/${version_number}`);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── revert_entry_version ──────────────────────────────────────────
  server.registerTool("revert_entry_version", {
    title: "Revert Entry Version",
    description:
      "Restore the draft to a previous version's snapshot and publish it as a new version. The current unpublished draft is replaced. " +
      "Returns the new version number.",
    inputSchema: {
      collection_slug: z.string().describe("The collection slug"),
      uuid: z.string().describe("The entry UUID"),
      version_number: z
        .number()
        .int()
        .positive()
        .describe("The version number to revert to (the snapshot to restore)"),
    },
  }, async ({ collection_slug, uuid, version_number }) => {
    const result = await client.post(`/${collection_slug}/${uuid}/versions/${version_number}/revert`, {});
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  // ── update_entry_version_label ────────────────────────────────────
  server.registerTool("update_entry_version_label", {
    title: "Update Entry Version Label",
    description:
      "Update a version's editable label and/or description. The snapshot payload itself is immutable.",
    inputSchema: {
      collection_slug: z.string().describe("The collection slug"),
      uuid: z.string().describe("The entry UUID"),
      version_number: z.number().int().positive().describe("The version number"),
      label: z
        .string()
        .nullable()
        .optional()
        .describe("Human-friendly label for this version (null clears it)"),
      description: z
        .string()
        .nullable()
        .optional()
        .describe("Longer note for this version (null clears it)"),
    },
  }, async ({ collection_slug, uuid, version_number, label, description }) => {
    const body: Record<string, unknown> = {};
    if (label !== undefined) body.label = label;
    if (description !== undefined) body.description = description;
    const result = await client.patch(
      `/${collection_slug}/${uuid}/versions/${version_number}`,
      body
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });
}
