import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const FIELD_TYPES_REFERENCE = `# Noma Field Types Reference

## Available Field Types (16 total)

### 1. text
Single-line text input (headings, titles, short strings).
- **Repeatable**: Yes
- **Options**: \`{ repeatable: boolean, hideInContentList: boolean, hiddenInAPI: boolean }\`
- **Validations**: required, unique*, charcount

### 2. longtext
Multi-line text area (descriptions, excerpts).
- **Repeatable**: Yes
- **Options**: \`{ repeatable: boolean, hideInContentList: boolean, hiddenInAPI: boolean }\`
- **Validations**: required, unique*, charcount

### 3. richtext
Markdown-based rich text (blog content, articles). Values are stored as **markdown** in the database.
- **Repeatable**: No
- **Options**: \`{ hideInContentList: boolean, hiddenInAPI: boolean, editor: { type: number, outputFormat: "html" | "markdown" } }\`
  - \`editor.outputFormat\`: **markdown** — Content API returns the **raw markdown** string for this field. **html** (default) — API returns **HTML rendered from that markdown** (sanitized). The admin editor is markdown-first; do not send Lexical JSON.
- **Content API**: On create/update/patch (including bulk), set richtext fields to a **single string** (markdown). Do not send \`{ html, json }\` objects.
- **Validations**: required

### 4. slug
Auto-generated URL slug. Can be attached to a text field to auto-generate.
- **Repeatable**: No
- **Options**: \`{ hideInContentList: boolean, hiddenInAPI: boolean, slug: { field: string | null, readonly: boolean } }\`
  - \`slug.field\`: The \`name\` of a text field to generate the slug from (e.g. "title")
  - \`slug.readonly\`: If true, prevents manual editing of the slug
- **Validations**: required, unique*, charcount

### 5. email
Email input with format validation.
- **Repeatable**: Yes
- **Options**: \`{ repeatable: boolean, hideInContentList: boolean, hiddenInAPI: boolean }\`
- **Validations**: required, unique*, charcount

### 6. password
Password input. Values are encrypted in storage.
- **Repeatable**: No
- **Cannot be inside groups**
- **Options**: \`{ hideInContentList: boolean, hiddenInAPI: boolean }\`
- **Validations**: required

### 7. number
Numeric input (integers, decimals, floats).
- **Repeatable**: Yes
- **Options**: \`{ repeatable: boolean, hideInContentList: boolean, hiddenInAPI: boolean }\`
- **Validations**: required, unique*, charcount (acts as min/max numeric limits)

### 8. enumeration
Dropdown list of predefined values.
- **Repeatable**: No
- **Options**: \`{ hideInContentList: boolean, hiddenInAPI: boolean, enumeration: { list: string[] }, multiple: boolean }\`
  - \`enumeration.list\`: Array of allowed values (e.g. ["draft", "published", "archived"])
  - \`multiple\`: If true, allows selecting multiple values
- **Validations**: required

### 9. boolean
True/false toggle.
- **Repeatable**: No
- **Options**: \`{ hideInContentList: boolean, hiddenInAPI: boolean }\`
- **Validations**: none

### 10. color
Color picker with hex/rgb values.
- **Repeatable**: Yes
- **Options**: \`{ repeatable: boolean, hideInContentList: boolean, hiddenInAPI: boolean }\`
- **Validations**: required

### 11. date
Calendar date picker with optional time.
- **Repeatable**: Yes
- **Options**: \`{ repeatable: boolean, hideInContentList: boolean, hiddenInAPI: boolean, includeTime: boolean, mode: "single" | "range" }\`
  - \`includeTime\`: If true, includes a time picker
  - \`mode\`: "single" for a single date, "range" for a date range
- **Validations**: required

### 12. time
Time picker.
- **Repeatable**: Yes
- **Options**: \`{ repeatable: boolean, hideInContentList: boolean, hiddenInAPI: boolean }\`
- **Validations**: required

### 13. media
File selector from the asset library.
- **Repeatable**: No
- **Options**: \`{ hideInContentList: boolean, hiddenInAPI: boolean, media: { type: number } }\`
  - \`media.type\`: 1 = Single file, 2 = Multiple files
- **Validations**: required
- **URLs (API / headless)**: \`url\`, \`thumbnail_url\`, and \`original_url\` on asset JSON with optional \`?variant=thumbnail\` or \`?variant=original\`. No auth is required to fetch; anyone with the link can read the file (opaque URL, not a per-user permission check).

### 14. relation
Links to entries in another collection.
- **Repeatable**: No
- **Options**: \`{ hideInContentList: boolean, hiddenInAPI: boolean, relation: { collection: number | null, type: number }, includeDraft: boolean }\`
  - \`relation.collection\`: The internal ID of the target collection
  - \`relation.type\`: 1 = One to One, 2 = One to Many
  - \`includeDraft\`: If true, draft entries are included in the relation picker
- **Validations**: required

### 15. json
Raw JSON data input.
- **Repeatable**: No
- **Options**: \`{ hideInContentList: boolean, hiddenInAPI: boolean }\`
- **Validations**: required

### 16. group
Container for nested child fields. Groups can be repeatable.
- **Repeatable**: Yes (via options.repeatable, which is **required**)
- **Options**: \`{ hideInContentList: boolean, hiddenInAPI: boolean, repeatable: boolean }\`
  - \`repeatable\`: **Required**. If true, allows multiple instances of the group.
- **Validations**: none
- **Children**: Group fields can contain child fields of any type except group and password. Create child fields using the create_field tool with \`parent_field_id\` set to the group field's internal ID.

---

## Validation Rules Format

All validations follow this structure:

\`\`\`json
{
  "required": {
    "status": true,
    "message": "Custom error message"
  },
  "unique": {
    "status": true,
    "message": "Must be unique"
  },
  "charcount": {
    "status": true,
    "type": "Between",
    "min": 1,
    "max": 255,
    "message": "Must be between 1 and 255 characters"
  }
}
\`\`\`

### charcount.type options:
- \`"Between"\` — requires both \`min\` and \`max\`
- \`"Min"\` — requires \`min\` only
- \`"Max"\` — requires \`max\` only

### Validation availability notes:
- \`unique\` is **not available** for: repeatable fields, fields inside groups, richtext, password, enumeration, boolean, color, date, time, media, relation, json, group
- \`charcount\` is only available for: text, longtext, slug, email, number
- For \`number\` fields, charcount acts as numeric min/max limits

---

## Field Name Rules

- Must be in kebab-case: lowercase letters, numbers, and hyphens only
- Regex: \`/^[a-z0-9]+(?:-[a-z0-9]+)*$/\`
- Examples: \`title\`, \`blog-post\`, \`meta-description\`, \`seo-title\`
- Must be unique within the same collection and parent scope

---

## Common Patterns

### Blog post collection:
- title (text, required)
- slug (slug, attached to title, required, unique)
- content (richtext)
- excerpt (longtext)
- featured-image (media, single file)
- published (boolean)
- category (relation, one-to-one to categories collection)
- seo (group, non-repeatable, with children: meta-title, meta-description)

### Product collection:
- name (text, required)
- slug (slug, attached to name, required, unique)
- price (number, required)
- description (richtext)
- images (media, multiple files)
- in-stock (boolean)
- tags (text, repeatable)
`;

const COLLECTIONS_REFERENCE = `# Noma Collections Reference

## What are Collections?

Collections are the blueprints for your content. They define the structure (schema) for different types of content — like "Blog Posts", "Products", or "Events". Each collection has a set of fields that define what data each entry contains.

## Collection Properties

- **name**: Display name (max 60 characters)
- **slug**: URL-friendly identifier in kebab-case (max 60 characters, must be unique per project)
- **is_singleton**: If true, the collection can only have one entry (useful for pages like "Homepage" or "About")

## Reserved Slugs

The following slugs cannot be used: \`collections\`, \`files\`

## Singleton Collections

Singleton collections are limited to a single content entry. Use them for:
- Homepage content
- Site-wide settings
- About page
- Footer content

## Creating a Collection with Fields

You can create a collection and all its fields in a single request using the \`create_collection\` tool with the \`fields\` parameter. This is the recommended approach for efficiency.

Group fields can include \`children\` in the same request to create nested fields.

## Field Order

Fields are displayed in the order they were created (by their \`order\` property). Use the \`reorder_fields\` tool to change the display order.

## Deleting a Collection

Deleting a collection permanently removes:
- The collection itself
- All its fields
- All content entries

The delete operation requires slug confirmation to prevent accidental deletions.
`;

const QUERY_REFERENCE = `# Noma Content Query Reference

## Overview

The \`list_entries\` tool supports advanced filtering, sorting, and pagination through query parameters. This reference covers all available options.

## The \`where\` Parameter

The \`where\` parameter accepts a nested object that gets converted to query parameters. All conditions default to AND logic unless wrapped in an \`or\` group.

### Operators

| Operator     | Description              | Example value          |
|-------------|--------------------------|------------------------|
| eq          | Equals (default)         | \`"published"\`        |
| lt          | Less than                | \`100\`                |
| lte         | Less than or equal       | \`100\`                |
| gt          | Greater than             | \`50\`                 |
| gte         | Greater than or equal    | \`50\`                 |
| not         | Not equal                | \`"draft"\`            |
| like        | Contains (SQL LIKE)      | \`"news"\`             |
| in          | In list (comma-separated)| \`"published,draft"\`  |
| not_in      | Not in list              | \`"archived,deleted"\` |
| null        | Is null                  | \`1\`                  |
| not_null    | Is not null              | \`1\`                  |
| between     | Between two values       | \`"10,100"\`           |
| not_between | Not between two values   | \`"10,100"\`           |

### Core Columns

These columns can be filtered directly (without going through field values):
- \`id\`, \`uuid\`, \`locale\`, \`state\`, \`created_at\`, \`updated_at\`, \`published_at\`

### Usage Examples

#### Simple equality (default operator is eq)
\`\`\`json
{ "where": { "state": "published" } }
\`\`\`

#### With operators
\`\`\`json
{ "where": { "price": { "lt": 50 }, "title": { "like": "news" } } }
\`\`\`

#### Multiple conditions (AND)
\`\`\`json
{
  "where": {
    "in-stock": true,
    "price": { "gte": 10, "lte": 100 },
    "state": { "not": "draft" }
  }
}
\`\`\`

#### OR group
All conditions inside the \`or\` array are combined with OR logic:
\`\`\`json
{
  "where": {
    "state": "published",
    "or": [
      { "tags": "clearance" },
      { "tags": "sale" }
    ]
  }
}
\`\`\`

#### Relation filtering
Filter entries based on related entry fields:
\`\`\`json
{
  "where": {
    "author": { "name": { "eq": "John" } },
    "category": { "slug": "tech" }
  }
}
\`\`\`

#### Complex query combining all features
\`\`\`json
{
  "where": {
    "price": { "lt": 50 },
    "in-stock": true,
    "or": [
      { "tags": "clearance" },
      { "campaign": { "name": "Summer Sale" } }
    ]
  }
}
\`\`\`

#### Null checks
\`\`\`json
{
  "where": {
    "published_at": { "not_null": 1 },
    "deleted-reason": { "null": 1 }
  }
}
\`\`\`

#### In / not_in (comma-separated values)
\`\`\`json
{
  "where": {
    "state": { "in": "published,featured" },
    "category": { "not_in": "archived,hidden" }
  }
}
\`\`\`

#### Between
\`\`\`json
{
  "where": {
    "price": { "between": "10,100" },
    "created_at": { "between": "2025-01-01,2025-12-31" }
  }
}
\`\`\`

## Sorting

Use the \`sort\` parameter with \`field:direction\` format. Comma-separate for multiple sort fields.

- \`"created_at:desc"\` — newest first
- \`"title:asc"\` — alphabetical
- \`"price:asc,created_at:desc"\` — cheapest first, then newest

**Sortable core columns**: \`id\`, \`created_at\`, \`updated_at\`, \`published_at\`
**Custom fields**: Any field name can be used for sorting.

## Pagination

### Option 1: paginate (recommended)
Returns paginated response with metadata (current_page, last_page, total, per_page, links):
\`\`\`json
{ "paginate": 10 }
\`\`\`

### Option 2: limit / offset
Simple result slicing (no metadata):
\`\`\`json
{ "limit": 20, "offset": 40 }
\`\`\`
Note: \`offset\` is ignored unless \`limit\` is also set. \`paginate\` overrides \`limit\`/\`offset\`.

## Special Parameters

### first
Returns only the first matching entry as a single object (not wrapped in an array):
\`\`\`json
{ "first": true }
\`\`\`

### count
Returns only the count of matching entries:
\`\`\`json
{ "count": true }
\`\`\`
Response: \`{ "count": 42 }\`

### exclude
Comma-separated field names to exclude from the response (useful for reducing payload size):
\`\`\`json
{ "exclude": "content,body,raw-html" }
\`\`\`

### state
Filter by publication state:
- Omitted or empty: returns only **published** entries (default)
- \`"draft"\`: returns only draft entries
- \`"published"\`: returns only published entries

### locale
Filter entries by locale code:
\`\`\`json
{ "locale": "en" }
\`\`\`

## Complete Example

Fetch published products under $50 that are in stock or on clearance, sorted by price, paginated:
\`\`\`json
{
  "collection_slug": "products",
  "where": {
    "price": { "lt": 50 },
    "or": [
      { "in-stock": true },
      { "tags": "clearance" }
    ]
  },
  "sort": "price:asc",
  "paginate": 12,
  "exclude": "long-description"
}
\`\`\`
`;

export function registerResources(server: McpServer): void {
  server.registerResource(
    "field-types",
    "nomacms://field-types",
    {
      title: "Field Types Reference",
      description:
        "Complete reference of all 16 Noma field types, their options, validations, and common patterns. Read this before creating fields.",
      mimeType: "text/plain",
    },
    async () => ({
      contents: [
        {
          uri: "nomacms://field-types",
          text: FIELD_TYPES_REFERENCE,
          mimeType: "text/plain",
        },
      ],
    })
  );

  server.registerResource(
    "collections-guide",
    "nomacms://collections-guide",
    {
      title: "Collections Guide",
      description:
        "Guide for working with Noma collections — properties, singletons, reserved slugs, and best practices.",
      mimeType: "text/plain",
    },
    async () => ({
      contents: [
        {
          uri: "nomacms://collections-guide",
          text: COLLECTIONS_REFERENCE,
          mimeType: "text/plain",
        },
      ],
    })
  );

  server.registerResource(
    "query-reference",
    "nomacms://query-reference",
    {
      title: "Content Query Reference",
      description:
        "Complete reference for querying content entries — where filters, operators, OR groups, relation filtering, sorting, pagination, and examples. Read this before building complex queries.",
      mimeType: "text/plain",
    },
    async () => ({
      contents: [
        {
          uri: "nomacms://query-reference",
          text: QUERY_REFERENCE,
          mimeType: "text/plain",
        },
      ],
    })
  );
}
