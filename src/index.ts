#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { NomaClient } from "./client.js";
import { registerProjectTools } from "./tools/project.js";
import { registerCollectionTools } from "./tools/collections.js";
import { registerFieldTools } from "./tools/fields.js";
import { registerContentTools } from "./tools/content.js";
import { registerAssetTools } from "./tools/assets.js";
import { registerWebhookTools } from "./tools/webhooks.js";
import { registerResources } from "./resources.js";

// ── API base (production) ─────────────────────────────────────────────
const NOMA_API_URL = "https://app.nomacms.com/api";

// ── Read configuration from environment ─────────────────────────────
const NOMA_API_KEY = process.env.NOMA_API_KEY;
const NOMA_PROJECT_ID = process.env.NOMA_PROJECT_ID;

if (!NOMA_API_KEY || !NOMA_PROJECT_ID) {
  console.error(
    "Missing required environment variables: NOMA_API_KEY, NOMA_PROJECT_ID"
  );
  process.exit(1);
}

// ── Create client and server ────────────────────────────────────────
const client = new NomaClient(NOMA_API_URL, NOMA_API_KEY, NOMA_PROJECT_ID);

const server = new McpServer({
  name: "nomacms",
  version: "1.0.0",
});

// ── Register resources and tools ────────────────────────────────────
registerResources(server);
registerProjectTools(server, client);
registerCollectionTools(server, client);
registerFieldTools(server, client);
registerContentTools(server, client);
registerAssetTools(server, client);
registerWebhookTools(server, client);

// ── Start stdio transport ───────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
