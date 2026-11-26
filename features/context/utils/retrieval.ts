import { estimateTextTokens } from "./token-budget";

export interface RetrievableMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt?: Date;
}

export interface RetrievedMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  score: number;
  tokens: number;
}

const STOPWORDS = new Set([
  "the", "is", "at", "which", "on", "a", "an", "and", "or", "but", "in", "with",
  "to", "for", "of", "as", "by", "that", "this", "it", "from", "be", "are", "was",
  "were", "been", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "can", "may", "might", "we", "you", "i", "me", "my", "our",
  "your", "they", "them", "their", "what", "when", "where", "who", "how", "why",
]);

function tokenizeKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_-]+/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

/**
 * Retrieves relevant older messages (outside the recent window) using
 * deterministic lexical + recency-weighted scoring, bounded by `retrievalBudgetTokens`.
 */
export function retrieveRelevantHistory(params: {
  query: string;
  olderMessages: RetrievableMessage[];
  retrievalBudgetTokens: number;
  maxResults?: number;
}): RetrievedMessage[] {
  const { query, olderMessages, retrievalBudgetTokens, maxResults = 5 } = params;
  if (!query.trim() || olderMessages.length === 0 || retrievalBudgetTokens <= 0) {
    return [];
  }

  const queryTerms = Array.from(new Set(tokenizeKeywords(query)));
  if (queryTerms.length === 0) {
    return [];
  }

  const scored: RetrievedMessage[] = [];
  const totalOlder = olderMessages.length;

  for (let i = 0; i < totalOlder; i++) {
    const msg = olderMessages[i];
    if (!msg.text.trim()) continue;

    const lower = msg.text.toLowerCase();
    let matchedTerms = 0;
    let termFrequency = 0;

    for (const term of queryTerms) {
      if (lower.includes(term)) {
        matchedTerms++;
        // Count occurrences (capped at 3 per term to avoid spam)
        const parts = lower.split(term);
        termFrequency += Math.min(3, parts.length - 1);
      }
    }

    if (matchedTerms === 0) continue;

    const coverage = matchedTerms / queryTerms.length;
    const recencyBoost = 0.15 * ((i + 1) / totalOlder);
    const score = coverage * 2 + termFrequency * 0.25 + recencyBoost;
    const tokens = estimateTextTokens(msg.text) + 12;

    scored.push({
      id: msg.id,
      role: msg.role,
      text: msg.text,
      score,
      tokens,
    });
  }

  // Sort by highest relevance score, then take up to maxResults within budget
  scored.sort((a, b) => b.score - a.score);

  const selected: RetrievedMessage[] = [];
  let usedTokens = 0;

  for (const item of scored) {
    if (selected.length >= maxResults) break;
    if (usedTokens + item.tokens > retrievalBudgetTokens) continue;
    selected.push(item);
    usedTokens += item.tokens;
  }

  // Restore chronological order among selected items
  const indexById = new Map(olderMessages.map((m, idx) => [m.id, idx]));
  selected.sort((a, b) => (indexById.get(a.id) ?? 0) - (indexById.get(b.id) ?? 0));

  return selected;
}
