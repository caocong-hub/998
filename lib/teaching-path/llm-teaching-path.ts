import { z } from "zod";

import { chatCompletionContent } from "@/lib/teaching-path/llm-client";

export type TeachingPathNodeResponse = {
  id: string;
  title: string;
  summary: string;
  details: string;
  type?: "Concept" | "Example" | "Practice";
  teachingRole?:
    | "Introduction"
    | "Core Concept"
    | "Reinforcement"
    | "Review"
    | "Application";
};

const pathItemSchema = z.object({
  sequence_index: z.number().int().positive(),
  type: z.enum(["Concept", "Example", "Practice"]),
  teaching_role: z.enum([
    "Introduction",
    "Core Concept",
    "Reinforcement",
    "Review",
    "Application",
  ]),
  title: z.string().min(1),
  overview: z.string().min(1),
  details: z.string().min(1),
});

const llmOutputSchema = z.object({
  instructional_path: z.array(pathItemSchema).min(1).max(12),
});

function stripMarkdownJsonFence(raw: string): string {
  let s = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(s);
  if (fence) {
    s = fence[1].trim();
  }
  return s;
}

const SYSTEM_PROMPT = `You are an instructional designer. Extract a structured teaching pathway from lesson or textbook text.

Output rules:
- Return ONLY a single JSON object (no markdown, no code fences, no commentary).
- The object must have exactly one key: "instructional_path", whose value is an array.
- Each array item must have:
  - "sequence_index": integer starting at 1, increasing by 1 per item
  - "type": one of "Concept", "Example", "Practice"
  - "teaching_role": one of "Introduction", "Core Concept", "Reinforcement", "Review", "Application"
  - "title": short heading for the learner
  - "overview": 1–2 sentences summarizing the learning goal
  - "details": fuller explanation, steps, or guidance (can be several sentences)
- Produce between 4 and 12 items when the source text supports it; fewer is OK if the text is short.
- Use the same language as the source text for title, overview, and details.`;

/**
 * Calls the configured LLM and maps the validated JSON to UI nodes.
 * Throws on any failure (caller falls back to heuristic).
 */
export async function parseTeachingPathWithLlm(
  text: string,
  options?: { truncated?: boolean }
): Promise<TeachingPathNodeResponse[]> {
  const truncatedNote = options?.truncated
    ? "\n\nNote: The excerpt below may be truncated; still extract the best pathway from what is visible.\n\n"
    : "\n\n";

  const userContent = `${truncatedNote}Source text:\n\n${text}`;

  const raw = await chatCompletionContent({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
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

  const sorted = [...validated.data.instructional_path].sort(
    (a, b) => a.sequence_index - b.sequence_index
  );

  return sorted.map((item) => ({
    id: `kp-${item.sequence_index}`,
    title: item.title,
    summary: item.overview,
    details: item.details,
    type: item.type,
    teachingRole: item.teaching_role,
  }));
}
