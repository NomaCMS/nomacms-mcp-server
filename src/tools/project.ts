import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NomaClient } from "../client.js";

export function registerProjectTools(
  server: McpServer,
  client: NomaClient
): void {
  server.registerTool("get_project", {
    title: "Get Project",
    description:
      "Get information about the current Noma project (name, uuid, default_locale, locales, etc.)",
  }, async () => {
    const result = await client.get("/");
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  server.registerTool("add_project_locale", {
    title: "Add project locale",
    description:
      "Add a locale code (e.g. tr, es) to the project. Requires admin API ability. Codes are lowercased. Call when setting up a multilingual site before creating translated content.",
    inputSchema: {
      locale: z
        .string()
        .describe("BCP 47 / short locale code, e.g. en, tr, es, de"),
    },
  }, async ({ locale }) => {
    const result = await client.post("/project/locales", { locale });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  server.registerTool("set_default_project_locale", {
    title: "Set default project locale",
    description:
      "Set the project's default locale. Adds the locale to the list if it was missing. Requires admin API ability.",
    inputSchema: {
      locale: z.string().describe("Locale code to use as default (e.g. en)"),
    },
  }, async ({ locale }) => {
    const result = await client.put("/project/locales/default", { locale });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });
}
