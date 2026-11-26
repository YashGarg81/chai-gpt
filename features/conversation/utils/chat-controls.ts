export const SUPPORTED_CHAT_MODELS = [
  { id: "openrouter/free", label: "OpenRouter Free (Auto)" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
] as const;

export const MAX_SYSTEM_PROMPT_CHARS = 4_000;

const SUPPORTED_MODEL_IDS = new Set<string>(
  SUPPORTED_CHAT_MODELS.map((m) => m.id)
);

export interface ChatControlsValidationResult {
  valid: boolean;
  error?: string;
  model: string | null;
  systemPrompt: string | null;
}

export function validateChatControlsInput(input: {
  model?: unknown;
  systemPrompt?: unknown;
}): ChatControlsValidationResult {
  let normalizedModel: string | null = null;
  if (input.model !== undefined && input.model !== null && input.model !== "") {
    if (typeof input.model !== "string" || !SUPPORTED_MODEL_IDS.has(input.model.trim())) {
      return {
        valid: false,
        error: "Unsupported model selection",
        model: null,
        systemPrompt: null,
      };
    }
    normalizedModel = input.model.trim();
  }

  let normalizedPrompt: string | null = null;
  if (input.systemPrompt !== undefined && input.systemPrompt !== null) {
    if (typeof input.systemPrompt !== "string") {
      return {
        valid: false,
        error: "System prompt must be a string",
        model: null,
        systemPrompt: null,
      };
    }
    const trimmed = input.systemPrompt.trim();
    if (trimmed.length > MAX_SYSTEM_PROMPT_CHARS) {
      return {
        valid: false,
        error: `System prompt exceeds ${MAX_SYSTEM_PROMPT_CHARS} character limit`,
        model: null,
        systemPrompt: null,
      };
    }
    normalizedPrompt = trimmed.length > 0 ? trimmed : null;
  }

  return {
    valid: true,
    model: normalizedModel,
    systemPrompt: normalizedPrompt,
  };
}
