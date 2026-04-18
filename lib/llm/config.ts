/**
 * Shared LLM env checks for API routes and clients.
 */

export type LlmProvider = "openai" | "gemini";

export function getLlmProvider(): LlmProvider {
  const p = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (p === "gemini" || p === "google") return "gemini";
  if (p === "openai") return "openai";
  if (!process.env.LLM_BASE_URL?.trim()) return "gemini";
  return "openai";
}

/** True when chatCompletionContent can run (OpenAI-compatible or Gemini). */
export function isLlmConfigured(): boolean {
  const key =
    process.env.LLM_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();
  const model = process.env.LLM_MODEL?.trim();
  if (!key || !model) return false;
  if (getLlmProvider() === "gemini") return true;
  return Boolean(process.env.LLM_BASE_URL?.trim());
}
