import { NextResponse } from "next/server";

import { currentUser } from "@/lib/auth";
import { runModule4Pipeline } from "@/lib/personalized-generator/module4-pipeline";
import { buildModule4Input, fullModule4InputSchema, normalizeModule4Result } from "../shared";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const json = await req.json().catch(() => null);
    const parsed = fullModule4InputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = normalizeModule4Result(await runModule4Pipeline(buildModule4Input(user.id, parsed.data)));
    return NextResponse.json({
      updated_learner_profile: result.updated_learner_profile,
      meta: {
        profile_source: result.meta.profile_source,
      },
    });
  } catch (error) {
    console.error("[PERSONALIZED_GENERATOR_PROFILE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
