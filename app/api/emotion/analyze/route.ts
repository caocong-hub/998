import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

import { currentUser } from "@/lib/auth";
import { buildFallbackEmotion } from "@/lib/emotion/fallback-emotion";
import { analyzeEmotionWithLlm } from "@/lib/emotion/llm-emotion";
import { isLlmConfigured } from "@/lib/llm/config";

const bodySchema = z
  .object({
    transcript: z.string().max(4000).optional().default(""),
    notes: z.string().max(4000).optional().default(""),
    locale: z.string().max(32).optional().default("zh-CN"),
  })
  .refine(
    (d) => d.transcript.trim().length > 0 || d.notes.trim().length > 0,
    { message: "Provide a non-empty transcript or notes." }
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

    const { transcript, notes, locale } = parsed.data;
    const combined = [transcript.trim(), notes.trim()].filter(Boolean).join("\n");

    if (isLlmConfigured()) {
      try {
        const result = await analyzeEmotionWithLlm({
          transcript,
          notes,
          locale,
        });
        return NextResponse.json({
          ...result,
          source: "llm",
          model: process.env.LLM_MODEL ?? null,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[EMOTION_ANALYZE] LLM failed, using heuristic:", msg);
      }
    }

    const fallback = buildFallbackEmotion(combined);
    return NextResponse.json({
      ...fallback,
      source: "heuristic",
      model: null,
    });
  } catch (error) {
    console.error("[EMOTION_ANALYZE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
