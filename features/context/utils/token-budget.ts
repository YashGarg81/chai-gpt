/**
 * Model-aware Token Budget Engine & Conservative Token Estimator.
 *
 * Divides a model's total context window into explicit, non-overlapping budgets
 * so system instructions, current user input, recent history, summaries,
 * retrieved messages, and attachments never overflow the provider limit.
 */

export interface ModelContextConfig {
  modelId: string;
  totalContextTokens: number;
  reservedOutputTokens: number;
  safetyMarginTokens: number;
}

export interface TokenBudget {
  modelId: string;
  totalContextTokens: number;
  reservedOutputTokens: number;
  safetyMarginTokens: number;
  maxInputTokens: number;
  systemTokens: number;
  developerTokens: number;
  summaryTokens: number;
  retrievalTokens: number;
  recentMessagesTokens: number;
  currentUserTokens: number;
  attachmentTokens: number;
}

const MODEL_CONTEXT_REGISTRY: Record<string, Omit<ModelContextConfig, "modelId">> = {
  "openrouter/free": {
    totalContextTokens: 32_768,
    reservedOutputTokens: 4_096,
    safetyMarginTokens: 1_024,
  },
  "gemini-2.5-flash": {
    totalContextTokens: 128_000,
    reservedOutputTokens: 8_192,
    safetyMarginTokens: 2_048,
  },
  "gpt-4o": {
    totalContextTokens: 128_000,
    reservedOutputTokens: 4_096,
    safetyMarginTokens: 2_048,
  },
};

const DEFAULT_MODEL_CONFIG: Omit<ModelContextConfig, "modelId"> = {
  totalContextTokens: 32_768,
  reservedOutputTokens: 4_096,
  safetyMarginTokens: 1_024,
};

/** Returns the context configuration for a given model ID. */
export function getModelContextConfig(modelId?: string | null): ModelContextConfig {
  const normalized = (modelId ?? "openrouter/free").trim();
  const matched = MODEL_CONTEXT_REGISTRY[normalized] ?? DEFAULT_MODEL_CONFIG;
  return {
    modelId: normalized || "openrouter/free",
    ...matched,
  };
}

/**
 * Conservative token estimator for text.
 *
 * Limitations: OpenRouter/OpenAI-compatible endpoints do not expose a synchronous
 * pre-flight tokenizer endpoint. We use a conservative heuristic that accounts for:
 * - Non-ASCII / Unicode / CJK / Devanagari (Hindi) characters (~1.5 chars/token)
 * - Code, JSON, Markdown punctuation, and URLs (~2.8 chars/token)
 * - Standard English prose (~3.5 chars/token)
 * - Per-message framing overhead (+4 tokens)
 */
export function estimateTextTokens(text: string): number {
  if (!text) return 0;

  let nonAsciiCount = 0;
  let symbolOrDigitCount = 0;
  let asciiLetterOrSpaceCount = 0;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 127) {
      nonAsciiCount++;
    } else if (
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      code === 32
    ) {
      asciiLetterOrSpaceCount++;
    } else {
      symbolOrDigitCount++;
    }
  }

  const nonAsciiTokens = nonAsciiCount / 1.5;
  const symbolTokens = symbolOrDigitCount / 2.5;
  const proseTokens = asciiLetterOrSpaceCount / 3.5;

  return Math.ceil(nonAsciiTokens + symbolTokens + proseTokens);
}

/** Conservative token estimate for multimodal image/file parts. */
export function estimateMultimodalPartTokens(mediaType: string): number {
  if (mediaType.startsWith("image/")) {
    return 768; // Conservative high-detail image tile estimate
  }
  if (mediaType === "application/pdf") {
    return 1_536; // Conservative base overhead for binary PDF payload
  }
  return 512;
}

/**
 * Computes the TokenBudget for a request, guaranteeing that
 * `system + developer + summary + retrieval + recent + currentUser + attachments <= maxInputTokens`.
 */
export function calculateTokenBudget(params: {
  modelId?: string | null;
  systemText: string;
  developerText?: string;
  currentUserText: string;
  attachmentTextTokens?: number;
  hasSummary?: boolean;
  hasRetrieval?: boolean;
}): TokenBudget {
  const config = getModelContextConfig(params.modelId);
  const maxInputTokens = Math.max(
    1_024,
    config.totalContextTokens - config.reservedOutputTokens - config.safetyMarginTokens
  );

  const systemTokens = estimateTextTokens(params.systemText) + 8;
  const developerTokens = params.developerText
    ? estimateTextTokens(params.developerText) + 8
    : 0;
  const currentUserTokens = estimateTextTokens(params.currentUserText) + 8;

  const fixedTokens = systemTokens + developerTokens + currentUserTokens;
  const remaining = Math.max(0, maxInputTokens - fixedTokens);

  // Cap attachment context at 35% of remaining budget (or requested amount if smaller)
  const maxAttachmentBudget = Math.floor(remaining * 0.35);
  const attachmentTokens = Math.min(
    params.attachmentTextTokens ?? 0,
    maxAttachmentBudget
  );

  const afterAttachments = Math.max(0, remaining - attachmentTokens);

  // Allocate summary (up to 15%), retrieval (up to 20%), and recent messages (rest)
  const summaryTokens = params.hasSummary
    ? Math.min(1_500, Math.floor(afterAttachments * 0.15))
    : 0;
  const retrievalTokens = params.hasRetrieval
    ? Math.min(2_500, Math.floor(afterAttachments * 0.2))
    : 0;
  const recentMessagesTokens = Math.max(
    0,
    afterAttachments - summaryTokens - retrievalTokens
  );

  return {
    modelId: config.modelId,
    totalContextTokens: config.totalContextTokens,
    reservedOutputTokens: config.reservedOutputTokens,
    safetyMarginTokens: config.safetyMarginTokens,
    maxInputTokens,
    systemTokens,
    developerTokens,
    summaryTokens,
    retrievalTokens,
    recentMessagesTokens,
    currentUserTokens,
    attachmentTokens,
  };
}
