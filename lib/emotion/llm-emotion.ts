import { z } from "zod";

import { chatCompletionContent } from "@/lib/teaching-path/llm-client";

export type EmotionDistributionItem = {
  label: string;
  confidence: number;
};

export type EmotionAnalyzeResult = {
  top_label: string;
  confidence: number;
  distribution: EmotionDistributionItem[];
  short_advice: string;
  entropy: number;
};

const distItemSchema = z.object({
  label: z.string().min(1).max(80),
  confidence: z.number().min(0).max(100),
});

const llmOutputSchema = z.object({
  top_label: z.string().min(1).max(80),
  top_confidence: z.number().min(0).max(100),
  distribution: z.array(distItemSchema).min(4).max(6),
  short_advice: z.string().max(500).optional(),
});

function stripMarkdownJsonFence(raw: string): string {
  let s = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(s);
  if (fence) {
    s = fence[1].trim();
  }
  return s;
}

function normalizeToUnitInterval(items: { label: string; confidence: number }[]): {
  label: string;
  confidence: number;
}[] {
  const weights = items.map((i) => Math.max(0, i.confidence));
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  return items.map((i, idx) => ({
    label: i.label,
    confidence: weights[idx] / sum,
  }));
}

export function entropyFromDistribution(probs: number[]): number {
  let h = 0;
  for (const p of probs) {
    if (p > 1e-10) {
      h -= p * Math.log2(p);
    }
  }
  return Math.round(h * 100) / 100;
}

const SYSTEM_PROMPT = `You are an assistant that infers a learner's emotional / engagement state from what they said (speech transcript) and optional notes.

Output rules:
- Return ONLY one JSON object (no markdown, no code fences).
- Use keys: "top_label" (single best label), "top_confidence" (0-100 how sure you are), "distribution" (array of 4-6 objects with "label" and "confidence" 0-100 weights; labels should be among learning contexts such as Focused, Neutral, Tired, Confused, Engaged, Frustrated, Happy — pick a consistent set that fits the text).
- Optional "short_advice": one sentence of gentle learning support in the same language as the user text.
- If the user text is very short or vague, still output a reasonable distribution with lower top_confidence.
- Match the user's language (Chinese vs English) for labels and advice when their input is clearly in that language.`;

function buildUserMessage(input: {
  transcript: string;
  notes: string;
  locale: string;
}): string {
  return [
    `Locale hint: ${input.locale}`,
    "",
    "Speech / transcript:",
    input.transcript.trim() || "(empty)",
    "",
    "Additional notes:",
    input.notes.trim() || "(none)",
  ].join("\n");
}

export async function analyzeEmotionWithLlm(input: {
  transcript: string;
  notes: string;
  locale: string;
}): Promise<EmotionAnalyzeResult> {
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

  const d = validated.data;
  const distributionNorm = normalizeToUnitInterval(d.distribution);
  const topConf = Math.min(1, Math.max(0, d.top_confidence / 100));
  const entropy = entropyFromDistribution(distributionNorm.map((x) => x.confidence));

  return {
    top_label: d.top_label,
    confidence: topConf,
    distribution: distributionNorm,
    short_advice: d.short_advice?.trim() || "",
    entropy,
  };
}
