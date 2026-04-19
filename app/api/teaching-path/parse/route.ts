import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { currentUser } from "@/lib/auth";
import { isLlmConfigured } from "@/lib/llm/config";
import { parseTeachingPathFromText } from "@/lib/teaching-path/heuristic-parse";
import { parseTeachingPathWithLlm } from "@/lib/teaching-path/llm-teaching-path";

const MIN_TEXT_LENGTH = 50;

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (text.length < MIN_TEXT_LENGTH) {
      return NextResponse.json(
        {
          error: `Text is too short. Enter at least ${MIN_TEXT_LENGTH} characters.`,
        },
        { status: 400 }
      );
    }

    if (isLlmConfigured()) {
      const maxInput = Number(process.env.LLM_MAX_INPUT_CHARS) || 12_000;
      const llmSlice = text.slice(0, maxInput);
      const truncated = text.length > llmSlice.length;

      try {
        const nodes = await parseTeachingPathWithLlm(llmSlice, { truncated });
        if (nodes.length > 0) {
          return NextResponse.json({
            nodes,
            source: "llm",
            model: process.env.LLM_MODEL ?? null,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[TEACHING_PATH_PARSE] LLM failed, using heuristic:", msg);
      }
    }

    const nodes = parseTeachingPathFromText(text);
    if (nodes.length === 0) {
      return NextResponse.json(
        { error: "Could not extract knowledge points. Try clearer paragraph breaks." },
        { status: 400 }
      );
    }

    return NextResponse.json({ nodes, source: "heuristic" });
  } catch (error) {
    console.error("[TEACHING_PATH_PARSE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
