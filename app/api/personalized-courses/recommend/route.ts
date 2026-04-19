import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

import { currentUser } from "@/lib/auth";
import { isLlmConfigured } from "@/lib/llm/config";
import { buildFallbackRecommendations } from "@/lib/personalized-courses/fallback-recommend";
import { recommendCoursesWithLlm } from "@/lib/personalized-courses/llm-recommend";

const bodySchema = z
  .object({
    direction: z.string().max(500).optional().default(""),
    completedCourseNames: z.array(z.string().max(200)).max(20).default([]),
    otherCourses: z.string().max(1000).optional().default(""),
    evaluation: z.string().max(8000).optional().default(""),
    suggestCount: z.number().int().min(1).max(4),
  })
  .refine(
    (d) =>
      d.direction.trim().length > 0 ||
      d.evaluation.trim().length > 0 ||
      d.completedCourseNames.length > 0 ||
      d.otherCourses.trim().length > 0,
    { message: "Add at least one of: direction, evaluation, completed courses, or other courses." }
  );

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
        {
          error: parsed.error.issues[0]?.message ?? "Invalid request body.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const input = parsed.data;

    if (isLlmConfigured()) {
      try {
        const result = await recommendCoursesWithLlm({
          direction: input.direction,
          completedCourseNames: input.completedCourseNames,
          otherCourses: input.otherCourses,
          evaluation: input.evaluation,
          suggestCount: input.suggestCount,
        });
        return NextResponse.json({
          ...result,
          source: "llm",
          model: process.env.LLM_MODEL ?? null,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[PERSONALIZED_COURSES] LLM failed, using fallback:", msg);
      }
    }

    const fallback = buildFallbackRecommendations({
      evaluation: input.evaluation,
      suggestCount: input.suggestCount,
    });

    return NextResponse.json({
      ...fallback,
      source: "heuristic",
      model: null,
    });
  } catch (error) {
    console.error("[PERSONALIZED_COURSES]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
