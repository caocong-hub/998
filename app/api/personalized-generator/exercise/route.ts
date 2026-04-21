import { NextResponse } from "next/server";

import { currentUser } from "@/lib/auth";
import { runModule4Pipeline } from "@/lib/personalized-generator/module4-pipeline";
import { baseBodySchema, buildModule4Input, normalizeModule4Result } from "../shared";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const json = await req.json().catch(() => null);
    const parsed = baseBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = normalizeModule4Result(await runModule4Pipeline(buildModule4Input(user.id, parsed.data)));
    return NextResponse.json({
      generated_adaptive_exercises: result.generated_adaptive_exercises,
      overall_generation_reason: result.overall_generation_reason,
      meta: {
        exercise_source: result.meta.exercise_source,
      },
    });
  } catch (error) {
    console.error("[PERSONALIZED_GENERATOR_EXERCISE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
