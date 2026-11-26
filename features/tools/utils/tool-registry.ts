import { tool, jsonSchema } from "ai";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { searchWebWithCitations } from "@/features/search/utils/web-search";
import { analyzeCsvDataset } from "@/features/analysis/utils/csv-analyzer";

export const REGISTERED_TOOL_NAMES = ["web_search", "analyze_csv"] as const;
const MAX_CSV_BYTES = 2 * 1024 * 1024;

export interface ToolExecutionContext {
  userId?: string;
  conversationId?: string;
}

/**
 * Returns the explicit server-side allowlisted tools for AI SDK `streamText`.
 * Only registered tools with validated schemas, ownership checks, and bounded execution may run.
 */
export function getRegisteredChatTools(context?: ToolExecutionContext) {
  return {
    web_search: tool({
      description:
        "Search the public web for fresh information and return verified source titles, domains, URLs, and snippets.",
      inputSchema: jsonSchema<{ query: string; maxResults?: number }>({
        type: "object",
        properties: {
          query: { type: "string", description: "Search query (max 300 chars)" },
          maxResults: { type: "number", description: "Max results (1-8)" },
        },
        required: ["query"],
      }),
      execute: async ({ query, maxResults }) => {
        if (typeof query !== "string" || !query.trim()) {
          return { error: "Invalid search query", results: [] };
        }
        return searchWebWithCitations(query, maxResults ?? 5);
      },
    }),
    analyze_csv: tool({
      description:
        "Deterministically analyze an uploaded CSV attachment (by attachmentId) or CSV text to compute row/column counts, missing values, and numeric min/max/mean/sum.",
      inputSchema: jsonSchema<{ attachmentId?: string; csvText?: string }>({
        type: "object",
        properties: {
          attachmentId: { type: "string", description: "Authorized CSV attachment ID" },
          csvText: { type: "string", description: "Fallback raw CSV text" },
        },
      }),
      execute: async ({ attachmentId, csvText }) => {
        if (attachmentId) {
          if (!context?.userId || !context?.conversationId) {
            return { error: "Unauthorized attachment context" };
          }
          const att = await prisma.attachment.findFirst({
            where: {
              id: attachmentId,
              ownerId: context.userId,
              conversationId: context.conversationId,
              deletedAt: null,
              processingStatus: "READY",
            },
            select: {
              storageKey: true,
              mimeType: true,
              fileExtension: true,
              sizeBytes: true,
            },
          });
          if (!att) {
            return { error: "Attachment not found or access denied" };
          }
          if (att.mimeType !== "text/csv" && att.fileExtension !== "csv") {
            return { error: "Attachment is not a CSV file" };
          }
          if (att.sizeBytes > MAX_CSV_BYTES) {
            return { error: "CSV attachment exceeds 2MB analysis limit" };
          }
          const buf = await storage.getObject(att.storageKey);
          return analyzeCsvDataset(buf.toString("utf8").slice(0, 200_000));
        }

        if (typeof csvText !== "string" || !csvText.trim()) {
          return { error: "Empty CSV input" };
        }
        return analyzeCsvDataset(csvText.slice(0, 200_000));
      },
    }),
  };
}
