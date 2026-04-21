import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

import { currentUser } from "@/lib/auth";
import {
  FIXED_MATH_COURSE,
  FIXED_MULTIMODAL_EMOTION,
  FIXED_STUDENT_ID,
} from "@/lib/personalized-courses/module3-knowledge";
import { buildModule3DemoPayload, getDefaultFeedback } from "@/lib/personalized-courses/module3-analyzer";

const bodySchema = z.object({
  feedbackText: z.string().max(8000).optional(),
});

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

    const feedbackText = parsed.data.feedbackText?.trim() || getDefaultFeedback();
    const result = buildModule3DemoPayload(feedbackText);

    return NextResponse.json({
      source: "module3-rule-engine",
      fixedStudent: {
        studentId: FIXED_STUDENT_ID,
        major: FIXED_MATH_COURSE,
        multimodalEmotion: FIXED_MULTIMODAL_EMOTION,
      },
      input: {
        feedbackText,
      },
      ...result,
    });
  } catch (error) {
    console.error("[PERSONALIZED_COURSES]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
