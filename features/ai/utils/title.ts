import { generateText } from "ai";
import { getChatModel } from "./model";

const MAX_TITLE_LENGTH = 100;

/**
 * Deterministic fallback title derived from the first user message.
 */
export function deriveFallbackTitle(message: string): string {
  const cleaned = message.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New Chat";
  if (cleaned.length <= 48) return cleaned;
  const sliced = cleaned.slice(0, 48);
  const lastSpace = sliced.lastIndexOf(" ");
  return (lastSpace > 20 ? sliced.slice(0, lastSpace) : sliced).trim();
}

/**
 * Generates a concise 3–6 word conversation title using Gemini,
 * falling back to {@link deriveFallbackTitle} on any error.
 */
export async function generateConversationTitle(
  firstUserMessage: string
): Promise<string> {
  const trimmed = firstUserMessage.trim();
  if (!trimmed) return "New Chat";

  try {
    const { text } = await generateText({
      model: getChatModel(),
      prompt: `Generate a concise 3 to 6 word title for a chat that starts with this user message. Return only the title, no quotes or punctuation at the end.\n\nMessage: ${trimmed.slice(0, 500)}`,
    });

    const normalized = text
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(/[.!?]+$/, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_TITLE_LENGTH);

    return normalized || deriveFallbackTitle(trimmed);
  } catch {
    return deriveFallbackTitle(trimmed);
  }
}
