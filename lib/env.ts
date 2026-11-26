/**
 * Validates required server environment variables and returns them.
 *
 * @throws {Error} When a required environment variable is missing.
 */
export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Returns the configured OpenRouter API key from `OPENROUTER_API_KEY`.
 *
 * @throws {Error} When `OPENROUTER_API_KEY` is not set.
 */
export function getOpenRouterApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw new Error("Missing required environment variable: OPENROUTER_API_KEY");
  }
  return key;
}
