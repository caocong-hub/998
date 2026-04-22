import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUser } from "@/lib/auth";
import { retrieveTopKSimilarQuestions } from "@/lib/personalized-generator/module4-retrieval";
import { buildModule4Input, fullModule4InputSchema } from "../shared";
import { runModule4Pipeline } from "@/lib/personalized-generator/module4-pipeline";

export const dynamic = "force-dynamic";

const similarBodySchema = z.intersection(
  fullModule4InputSchema,
  z.object({
    query: z.string().max(2000).optional(),
  })
);

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

    const module4Input = buildModule4Input(user.id, parsed.data);
    const retrievalFeatures = {
      target_concept: module4Input.module1_to_module4.node_title,
      weak_points: module4Input.question_records
        .flatMap((r) => r.from_practice_record?.error_tags ?? [])
        .slice(0, 5),
      knowledge_tags: module4Input.module1_to_module4.knowledge_tags ?? [],
    };
    const retrieval = await retrieveTopKSimilarQuestions(query, 5, {
      targetConcept: retrievalFeatures.target_concept,
      weakPoints: retrievalFeatures.weak_points,
      knowledgeTags: retrievalFeatures.knowledge_tags,
    });
    return NextResponse.json({
      similar_questions_top5: retrieval.items ?? [],
      retrieval_context: {
        query_used: query,
        source: retrieval.source,
        error: retrieval.error,
        features_used: retrievalFeatures,
      },
    });
  } catch (error) {
    console.error("[PERSONALIZED_GENERATOR_SIMILAR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
