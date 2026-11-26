import { createOpenAI } from "@ai-sdk/openai";
import { getOpenRouterApiKey } from "@/lib/env";

/** Default OpenRouter model used when a conversation has no model override. */
export const DEFAULT_CHAT_MODEL = "openrouter/free";

/**
 * Returns an OpenRouter language model instance for chat completions.
 *
 * @param modelId - Optional model identifier; falls back to {@link DEFAULT_CHAT_MODEL}.
 */
export function getChatModel(modelId?: string | null) {
  const openrouter = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: getOpenRouterApiKey(),
  });
  return openrouter.chat(modelId || DEFAULT_CHAT_MODEL);
}