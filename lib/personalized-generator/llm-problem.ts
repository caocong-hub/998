import { z } from "zod";

import { chatCompletionContent } from "@/lib/teaching-path/llm-client";

export type LearnerProfileInput = {
  name?: string;
  level: string;
  strengths: string[];
  weaknesses: string[];
  recs: string[];
};

export type GenerateProblemLlmInput = {
  profile: LearnerProfileInput;
  topic?: string;
};

const problemSchema = z.object({
  title: z.string().min(1).max(240),
  stem: z.string().min(1).max(12_000),
});

function stripMarkdownJsonFence(raw: string): string {
  let s = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(s);
  if (fence) {
    s = fence[1].trim();
  }
  return s;
}

const SYSTEM_PROMPT = `You are an expert tutor who writes one clear practice problem at a time.

Output rules:
- Return ONLY a single JSON object (no markdown, no code fences, no commentary).
- Keys must be exactly: "title" (short heading) and "stem" (full problem statement; may include sub-questions).
- Difficulty and style must match the learner level given in the user message.
- Target the learner's weaknesses; use strengths only for appropriate scaffolding.
- Use the same language as the learner profile and recommendations in the user message (e.g. if they are in Chinese, write in Chinese).`;

function buildUserMessage(input: GenerateProblemLlmInput): string {
  const { profile, topic } = input;
  const lines = [
    "Learner profile:",
    `- Name: ${profile.name ?? "(not specified)"}`,
    `- Level: ${profile.level}`,
    `- Strengths: ${profile.strengths.join("; ")}`,
    `- Weaknesses: ${profile.weaknesses.join("; ")}`,
    `- Tutor recommendations: ${profile.recs.join(" ")}`,
  ];
  if (topic?.trim()) {
    lines.push("", `Preferred topic or context (optional): ${topic.trim()}`);
  } else {
    lines.push("", "No specific topic given — choose a topic that fits the weaknesses.");
  }
  return lines.join("\n");
}

export async function generateProblemWithLlm(
  input: GenerateProblemLlmInput
): Promise<{ title: string; stem: string }> {
  const raw = await chatCompletionContent({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserMessage(input) },
    ],
  });

  const jsonText = stripMarkdownJsonFence(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("LLM returned non-JSON");
  }

  const validated = problemSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(`LLM JSON schema mismatch: ${validated.error.message}`);
  }

  return validated.data;
}
