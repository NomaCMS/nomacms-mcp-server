import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NomaClient } from "../client.js";

export function registerWebhookTools(
  server: McpServer,
  client: NomaClient
): void {
  server.registerTool("list_webhooks", {
    title: "List Webhooks",
    description: "List all webhooks configured for the current project",
    inputSchema: {},
  }, async () => {
    const result = await client.get("/webhooks");
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  server.registerTool("get_webhook", {
    title: "Get Webhook",
    description: "Get a webhook by UUID",
    inputSchema: {
      uuid: z.string().describe("Webhook UUID"),
    },
  }, async ({ uuid }) => {
    const result = await client.get(`/webhooks/${uuid}`);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  server.registerTool("create_webhook", {
    title: "Create Webhook",
    description: "Create a webhook for content and auth events",
    inputSchema: {
      name: z.string().describe("Webhook display name"),
      description: z.string().optional().describe("Optional description"),
      url: z.string().describe("Destination URL"),
      secret: z.string().optional().describe("Optional HMAC secret"),
      events: z.array(z.string()).min(1).describe("Event names"),
      sources: z.array(z.string()).min(1).describe("Event sources (e.g. cms, api)"),
      payload: z.boolean().optional().describe("Whether to include payload details"),
      status: z.boolean().optional().describe("Webhook active status"),
      collection_ids: z.array(z.number()).optional().describe("Optional collection ID filter"),
    },
  }, async ({ name, description, url, secret, events, sources, payload, status, collection_ids }) => {
    const body: Record<string, unknown> = {
      name,
      url,
      events,
      sources,
    };

    if (description !== undefined) body.description = description;
    if (secret !== undefined) body.secret = secret;
    if (payload !== undefined) body.payload = payload;
    if (status !== undefined) body.status = status;
    if (collection_ids !== undefined) body.collection_ids = collection_ids;

    const result = await client.post("/webhooks", body);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  server.registerTool("update_webhook", {
    title: "Update Webhook",
    description: "Update a webhook by UUID",
    inputSchema: {
      uuid: z.string().describe("Webhook UUID"),
      name: z.string().describe("Webhook display name"),
      description: z.string().optional().describe("Optional description"),
      url: z.string().describe("Destination URL"),
      secret: z.string().optional().describe("Optional HMAC secret"),
      events: z.array(z.string()).min(1).describe("Event names"),
      sources: z.array(z.string()).min(1).describe("Event sources (e.g. cms, api)"),
      payload: z.boolean().optional().describe("Whether to include payload details"),
      status: z.boolean().optional().describe("Webhook active status"),
      collection_ids: z.array(z.number()).optional().describe("Optional collection ID filter"),
    },
  }, async ({ uuid, name, description, url, secret, events, sources, payload, status, collection_ids }) => {
    const body: Record<string, unknown> = {
      name,
      url,
      events,
      sources,
    };

    if (description !== undefined) body.description = description;
    if (secret !== undefined) body.secret = secret;
    if (payload !== undefined) body.payload = payload;
    if (status !== undefined) body.status = status;
    if (collection_ids !== undefined) body.collection_ids = collection_ids;

    const result = await client.put(`/webhooks/${uuid}`, body);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  server.registerTool("delete_webhook", {
    title: "Delete Webhook",
    description: "Delete a webhook by UUID",
    inputSchema: {
      uuid: z.string().describe("Webhook UUID"),
    },
  }, async ({ uuid }) => {
    const result = await client.delete(`/webhooks/${uuid}`);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  server.registerTool("list_webhook_logs", {
    title: "List Webhook Logs",
    description: "List delivery logs for a webhook",
    inputSchema: {
      uuid: z.string().describe("Webhook UUID"),
      paginate: z.number().optional().describe("Items per page"),
      page: z.number().optional().describe("Page number"),
    },
  }, async ({ uuid, paginate, page }) => {
    const params: Record<string, unknown> = {};
    if (paginate !== undefined) params.paginate = paginate;
    if (page !== undefined) params.page = page;

    const result = await client.get(`/webhooks/${uuid}/logs`, params);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });
}

