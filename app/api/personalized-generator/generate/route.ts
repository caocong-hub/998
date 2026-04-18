import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUser } from "@/lib/auth";
import { isLlmConfigured } from "@/lib/llm/config";
import { generateProblemWithLlm } from "@/lib/personalized-generator/llm-problem";

const MAX_TOPIC_LEN = 500;
const MAX_STRING_FIELD = 200;
const MAX_LIST_ITEMS = 12;
const MAX_LIST_STRING_LEN = 400;

const profileSchema = z.object({
  name: z.string().max(MAX_STRING_FIELD).optional(),
  level: z.string().min(1).max(MAX_STRING_FIELD),
  strengths: z
    .array(z.string().max(MAX_LIST_STRING_LEN))
    .min(1)
    .max(MAX_LIST_ITEMS),
  weaknesses: z
    .array(z.string().max(MAX_LIST_STRING_LEN))
    .min(1)
    .max(MAX_LIST_ITEMS),
  recs: z
    .array(z.string().max(MAX_LIST_STRING_LEN))
    .min(1)
    .max(MAX_LIST_ITEMS),
});

const bodySchema = z.object({
  profile: profileSchema,
  topic: z.string().max(MAX_TOPIC_LEN).optional(),
});

function mockFallbackProblem(): { title: string; stem: string } {
  return {
    title: "Practice: application and edge cases",
    stem:
      "Apply the core formula to a real-world scenario; explain each substitution step.",
  };
}

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { profile, topic } = parsed.data;

    if (isLlmConfigured()) {
      try {
        const problem = await generateProblemWithLlm({ profile, topic });
        return NextResponse.json({
          problem,
          source: "llm",
          model: process.env.LLM_MODEL ?? null,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[PERSONALIZED_GENERATOR] LLM failed, using mock:", msg);
      }
    }

    return NextResponse.json({
      problem: mockFallbackProblem(),
      source: "mock",
      model: null,
    });
  } catch (error) {
    console.error("[PERSONALIZED_GENERATOR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
