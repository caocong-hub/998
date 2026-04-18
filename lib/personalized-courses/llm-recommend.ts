import { z } from "zod";

import { chatCompletionContent } from "@/lib/teaching-path/llm-client";

export type RecommendationItem = {
  id: string;
  name: string;
  reason: string;
  score: number;
  details: string;
};

export type ScoreBreakdown = { label: string; value: number };

export type CourseRecommendResult = {
  sentiment: string;
  recommendations: RecommendationItem[];
  scores: ScoreBreakdown[];
};

const recommendationSchema = z.object({
  name: z.string().min(1).max(200),
  reason: z.string().min(1).max(2000),
  score: z.number().int().min(0).max(100),
  details: z.string().min(1).max(2000),
});

const llmOutputSchema = z.object({
  sentiment: z.string().min(1).max(2000),
  recommendations: z.array(recommendationSchema).min(1).max(4),
  scores: z
    .array(
      z.object({
        label: z.string().min(1).max(120),
        value: z.number().int().min(0).max(100),
      })
    )
    .min(2)
    .max(6),
});

function stripMarkdownJsonFence(raw: string): string {
  let s = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(s);
  if (fence) {
    s = fence[1].trim();
  }
  return s;
}

export type RecommendLlmInput = {
  direction: string;
  completedCourseNames: string[];
  otherCourses: string;
  evaluation: string;
  suggestCount: number;
};

const SYSTEM_PROMPT = `You are a learning advisor for university / online CS-style programs.

Output rules:
- Return ONLY one JSON object (no markdown, no code fences).
- Keys: "sentiment" (1–3 sentences analyzing the learner's evaluation tone), "recommendations" (array), "scores" (array).
- Each recommendation: "name" (course title), "reason" (why it fits), "score" (integer 0–100 match score), "details" (what the course covers or next steps).
- "scores" is 3–5 objects with "label" and "value" (0–100) for dimensions like match to direction, addressing gaps, practical fit.
- Use the same language as the user inputs when possible (e.g. Chinese if they wrote in Chinese).
- Course names should be plausible academic course titles, not the exact strings from input unless appropriate.`;

function buildUserMessage(input: RecommendLlmInput): string {
  const n = input.suggestCount;
  const completed =
    input.completedCourseNames.length > 0
      ? input.completedCourseNames.join(", ")
      : "(none selected)";
  return [
    `Produce exactly ${n} recommendations in the "recommendations" array (length must be ${n}).`,
    "",
    `Main direction: ${input.direction.trim() || "(not specified)"}`,
    `Completed courses (names): ${completed}`,
    `Other courses / notes: ${input.otherCourses.trim() || "(none)"}`,
    "",
    "Learner evaluation / reflection:",
    input.evaluation.trim() || "(none)",
  ].join("\n");
}

export async function recommendCoursesWithLlm(
  input: RecommendLlmInput
): Promise<CourseRecommendResult> {
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

  const validated = llmOutputSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(`LLM JSON schema mismatch: ${validated.error.message}`);
  }

  const { sentiment, recommendations, scores } = validated.data;

  if (recommendations.length !== input.suggestCount) {
    throw new Error(
      `Expected ${input.suggestCount} recommendations, got ${recommendations.length}`
    );
  }

  const ts = Date.now();
  const withIds: RecommendationItem[] = recommendations.map((r, i) => ({
    id: `llm-${ts}-${i}`,
    name: r.name,
    reason: r.reason,
    score: r.score,
    details: r.details,
  }));

  return {
    sentiment,
    recommendations: withIds,
    scores,
  };
}
