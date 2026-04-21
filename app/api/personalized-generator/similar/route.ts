import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUser } from "@/lib/auth";
import { retrieveTopKSimilarQuestions } from "@/lib/personalized-generator/module4-retrieval";
import { baseBodySchema, buildModule4Input } from "../shared";
import { runModule4Pipeline } from "@/lib/personalized-generator/module4-pipeline";

export const dynamic = "force-dynamic";

const similarBodySchema = baseBodySchema.extend({
  query: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const json = await req.json().catch(() => null);
    const parsed = similarBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let query = parsed.data.query?.trim();
    if (!query) {
      const pipeline = await runModule4Pipeline(buildModule4Input(user.id, parsed.data));
      query = pipeline.generated_adaptive_exercises?.[0]?.problem ?? "guided practice";
    }

    const retrieval = await retrieveTopKSimilarQuestions(query, 5);
    return NextResponse.json({
      similar_questions_top5: retrieval.items ?? [],
      retrieval_context: {
        query_used: query,
        source: retrieval.source,
        error: retrieval.error,
      },
    });
  } catch (error) {
    console.error("[PERSONALIZED_GENERATOR_SIMILAR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
