import { generateText } from "ai";
import { getChatModel } from "@/features/ai/utils/model";

export interface ConversationSummaryData {
  conversationGoal: string;
  topics: string[];
  requirements: string[];
  decisions: string[];
  technicalContext: string[];
  importantFacts: string[];
  pendingTasks: string[];
  unresolvedQuestions: string[];
  lastKnownState: string;
  updatedAt: string;
}

export interface SummarizableMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

/**
 * Formats structured summary data into a compact, readable text block.
 */
export function formatStructuredSummaryText(data: ConversationSummaryData): string {
  const sections: string[] = [];
  if (data.conversationGoal) sections.push(`Goal: ${data.conversationGoal}`);
  if (data.topics.length) sections.push(`Topics: ${data.topics.join(", ")}`);
  if (data.requirements.length) sections.push(`Requirements: ${data.requirements.join("; ")}`);
  if (data.decisions.length) sections.push(`Decisions: ${data.decisions.join("; ")}`);
  if (data.technicalContext.length) sections.push(`Technical: ${data.technicalContext.join("; ")}`);
  if (data.importantFacts.length) sections.push(`Facts: ${data.importantFacts.join("; ")}`);
  if (data.pendingTasks.length) sections.push(`Pending: ${data.pendingTasks.join("; ")}`);
  if (data.unresolvedQuestions.length) sections.push(`Open Questions: ${data.unresolvedQuestions.join("; ")}`);
  if (data.lastKnownState) sections.push(`State: ${data.lastKnownState}`);
  return sections.join("\n");
}

/**
 * Deterministic extractive fallback summary when LLM summarization is unavailable or fails.
 * Never fabricates facts and preserves key user/assistant points.
 */
export function buildExtractiveFallbackSummary(
  messages: SummarizableMessage[],
  previousSummary?: ConversationSummaryData | null
): ConversationSummaryData {
  const userPoints = messages
    .filter((m) => m.role === "user" && m.text.trim().length > 0)
    .slice(-5)
    .map((m) => m.text.trim().slice(0, 180));

  const assistantPoints = messages
    .filter((m) => m.role === "assistant" && m.text.trim().length > 0)
    .slice(-3)
    .map((m) => m.text.trim().slice(0, 180));

  return {
    conversationGoal:
      previousSummary?.conversationGoal ||
      userPoints[0] ||
      "Ongoing conversation",
    topics: previousSummary?.topics ?? [],
    requirements: Array.from(
      new Set([...(previousSummary?.requirements ?? []), ...userPoints])
    ).slice(-8),
    decisions: previousSummary?.decisions ?? [],
    technicalContext: previousSummary?.technicalContext ?? [],
    importantFacts: Array.from(
      new Set([...(previousSummary?.importantFacts ?? []), ...assistantPoints])
    ).slice(-6),
    pendingTasks: previousSummary?.pendingTasks ?? [],
    unresolvedQuestions: previousSummary?.unresolvedQuestions ?? [],
    lastKnownState: assistantPoints[assistantPoints.length - 1] ?? previousSummary?.lastKnownState ?? "",
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Generates or updates a rolling structured conversation summary using the AI model,
 * falling back safely to `buildExtractiveFallbackSummary` on any error or timeout.
 */
export async function generateRollingSummary(params: {
  messagesToSummarize: SummarizableMessage[];
  previousSummary?: ConversationSummaryData | null;
  modelId?: string | null;
}): Promise<{ data: ConversationSummaryData; text: string; usedFallback: boolean }> {
  const { messagesToSummarize, previousSummary, modelId } = params;

  if (messagesToSummarize.length === 0 && previousSummary) {
    return {
      data: previousSummary,
      text: formatStructuredSummaryText(previousSummary),
      usedFallback: false,
    };
  }

  const transcript = messagesToSummarize
    .map((m) => `[${m.role.toUpperCase()}]: ${m.text.slice(0, 1200)}`)
    .join("\n\n");

  const priorBlock = previousSummary
    ? `Existing summary:\n${formatStructuredSummaryText(previousSummary)}\n\n`
    : "";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);

    const result = await generateText({
      model: getChatModel(modelId),
      system:
        "You are a precise conversation summarizer. Return ONLY valid JSON matching the requested schema. Do not invent facts. Preserve exact numbers, decisions, constraints, and unresolved tasks.",
      prompt: `${priorBlock}Summarize these conversation messages into JSON with keys: conversationGoal (string), topics (string[]), requirements (string[]), decisions (string[]), technicalContext (string[]), importantFacts (string[]), pendingTasks (string[]), unresolvedQuestions (string[]), lastKnownState (string).\n\nMessages:\n${transcript}`,
      abortSignal: controller.signal,
    });

    clearTimeout(timeout);

    const raw = result.text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(raw) as Partial<ConversationSummaryData>;

    const data: ConversationSummaryData = {
      conversationGoal: typeof parsed.conversationGoal === "string" ? parsed.conversationGoal : (previousSummary?.conversationGoal ?? ""),
      topics: Array.isArray(parsed.topics) ? parsed.topics.map(String) : [],
      requirements: Array.isArray(parsed.requirements) ? parsed.requirements.map(String) : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions.map(String) : [],
      technicalContext: Array.isArray(parsed.technicalContext) ? parsed.technicalContext.map(String) : [],
      importantFacts: Array.isArray(parsed.importantFacts) ? parsed.importantFacts.map(String) : [],
      pendingTasks: Array.isArray(parsed.pendingTasks) ? parsed.pendingTasks.map(String) : [],
      unresolvedQuestions: Array.isArray(parsed.unresolvedQuestions) ? parsed.unresolvedQuestions.map(String) : [],
      lastKnownState: typeof parsed.lastKnownState === "string" ? parsed.lastKnownState : "",
      updatedAt: new Date().toISOString(),
    };

    return {
      data,
      text: formatStructuredSummaryText(data),
      usedFallback: false,
    };
  } catch {
    const fallback = buildExtractiveFallbackSummary(messagesToSummarize, previousSummary);
    return {
      data: fallback,
      text: formatStructuredSummaryText(fallback),
      usedFallback: true,
    };
  }
}
