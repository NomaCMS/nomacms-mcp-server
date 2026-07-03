# NomaCMS MCP Server

An MCP (Model Context Protocol) server that connects AI agents like [Cursor](https://cursor.com) and [Claude Code](https://claude.com/product/claude-code) to your NomaCMS project. Manage collections, fields, content entries, assets, and webhooks programmatically through natural language.

## Configuration

- `NOMA_API_KEY`: API key from **User settings → API keys** — see [API key abilities](#api-key-abilities).
- `NOMA_PROJECT_ID`: Your project's UUID — you can find it on the project home page or under **Project settings → API Access**

## Usage with Cursor

Add this to your Cursor MCP settings (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "nomacms": {
      "command": "npx",
      "args": ["-y", "@nomacms/mcp-server"],
      "env": {
        "NOMA_API_KEY": "your-api-key",
        "NOMA_PROJECT_ID": "your-project-uuid"
      }
    }
  }
}
```

## Usage with Claude Code

Add the MCP server using the Claude Code CLI:

```bash
claude mcp add nomacms \
  -e NOMA_API_KEY=your-api-key \
  -e NOMA_PROJECT_ID=your-project-uuid \
  -- npx -y @nomacms/mcp-server
```

## Available Tools (39)

### Project
- `get_project` — Get project information (`default_locale`, `locales`, etc.)
- `add_project_locale` — Add a locale code to the project (requires **admin**)
- `set_default_project_locale` — Set the default locale (requires **admin**)

Removing locales is intentionally **not** exposed here (use **Project settings** → **Localization** in the NomaCMS dashboard if you must remove a locale).

### Collections
- `list_collections` — List all collections
- `get_collection` — Get a collection with its full field schema
- `create_collection` — Create a collection (with optional batch field creation)
- `update_collection` — Update a collection's name and slug
- `reorder_collections` — Reorder collections

### Fields
- `create_field` — Add a field to a collection
- `update_field` — Update a field
- `reorder_fields` — Reorder fields within a collection

### Content Entries
- `list_entries` — List entries with advanced filtering (`where` with 13 operators, OR groups, relation filtering), sorting, pagination, count, and first
- `get_entry` — Get a single content entry
- `create_entry` — Create a content entry
- `update_entry` — Update a content entry
- `patch_entry` — Partially update an entry (HTTP PATCH; merge only the fields you send)
- `publish_entry` — Publish the draft as a new immutable version (**update**)
- `unpublish_entry` — Clear the live published pointer; versions retained (**update**)
- `delete_entry` — Soft-delete a content entry (moves to trash)
- `bulk_create_entries` — Create multiple entries atomically
- `bulk_update_entries` — Update multiple entries atomically by UUID
- `bulk_delete_entries` — Delete multiple entries atomically by UUID
- `link_entry_translation` — Link two entries (different locales) into the same translation group (`POST …/link-translation`; requires **update** ability)
- `list_entry_versions` — List version history for an entry
- `get_entry_version` — Fetch one version by number (includes snapshot payload)
- `revert_entry_version` — Restore draft from a prior snapshot and publish (**update**)
- `update_entry_version_label` — Edit label/description on a version; snapshot unchanged (**update**)

**Content API shape:** Each entry has `uuid`, `locale`, `published_at`, and **`fields`** (custom field values). Richtext values are **markdown strings** on write; on read they are either raw markdown or rendered HTML depending on the field’s `editor.outputFormat` (`markdown` vs `html`). **Relation fields** return nested entry objects (or arrays for one-to-many) on read; on write send only the related entry’s **UUID** or **numeric id** (never the full nested object from a previous `get_entry`). `get_entry` supports `translation_locale`, `exclude`, `timestamps`, and `state` query parameters.

**Asset URLs:** The API returns `url`, `thumbnail_url`, and `original_url` as stable links (optional `?variant=thumbnail` or `?variant=original`).

### Assets
- `list_assets` — List assets with pagination
- `get_asset` — Get an asset by UUID or filename
- `upload_asset` — Upload a file as an asset
- `bulk_upload_assets` — Upload multiple files atomically
- `bulk_update_asset_metadata` — Update metadata for multiple assets atomically
- `delete_asset` — Delete an asset

### Webhooks
- `list_webhooks` — List all webhooks for the project
- `get_webhook` — Get a webhook by UUID
- `create_webhook` — Create a webhook for content and auth events (`name`, `url`, `events`, `sources`; optional `description`, `secret`, `payload`, `status`, `collection_ids`)
- `update_webhook` — Update a webhook by UUID (same fields as create)
- `delete_webhook` — Delete a webhook by UUID
- `list_webhook_logs` — List delivery logs for a webhook (`uuid`; optional `paginate`, `page`)

## Resources

The server exposes three reference resources that AI agents can read for context:

- **Field Types Reference** (`nomacms://field-types`) — Complete reference of all 16 field types, their options, validations, and common patterns.
- **Collections Guide** (`nomacms://collections-guide`) — Guide for working with collections, singletons, reserved slugs, and best practices.
- **Query Reference** (`nomacms://query-reference`) — Full documentation for content queries: `where` filters with 13 operators, OR groups, relation filtering, sorting, pagination, and examples.

## API key abilities

Your API key needs the appropriate abilities for the tools you want to use:

| Ability  | Tools                                                       |
|----------|-------------------------------------------------------------|
| `read`   | list/get collections, entries, assets, webhooks; webhook logs |
| `create` | create entries, upload assets, create webhooks               |
| `update` | update entries, **`link_entry_translation`**, update asset metadata, update webhooks |
| `delete` | delete entries, delete assets, delete webhooks               |
| `admin`  | create/update/reorder collections and fields; add/set default **project locales** (MCP does not expose locale removal) |

Create the key in the NomaCMS dashboard under **User settings → API keys**. Copy the **Project ID** from the project home page or **Project settings → API Access** when you configure this server.

## Using Multiple Projects

Each MCP entry connects to a single NomaCMS project. To work with multiple projects, add separate entries in your MCP config:

```json
{
  "mcpServers": {
    "nomacms-blog": {
      "command": "npx",
      "args": ["-y", "@nomacms/mcp-server"],
      "env": {
        "NOMA_API_KEY": "blog-project-api-key",
        "NOMA_PROJECT_ID": "blog-project-uuid"
      }
    },
    "nomacms-store": {
      "command": "npx",
      "args": ["-y", "@nomacms/mcp-server"],
      "env": {
        "NOMA_API_KEY": "store-project-api-key",
        "NOMA_PROJECT_ID": "store-project-uuid"
      }
    }
  }
}
```

## License

MIT
