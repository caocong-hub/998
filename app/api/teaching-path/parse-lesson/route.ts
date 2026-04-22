import { NextResponse } from "next/server";
import { asProxyError, ensureAuthed, parseJsonSafe, resolveModule1ApiBase } from "../_shared";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await ensureAuthed();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || (typeof body?.text !== "string" && typeof body?.title !== "string")) {
    return asProxyError(400, "Invalid request body for parse lesson");
  }

  const base = resolveModule1ApiBase();
  const payload = {
    title: typeof body?.title === "string" ? body.title : "Imported Lesson",
    text: typeof body?.text === "string" ? body.text : "",
    learner_feedback:
      typeof body?.learner_feedback === "object" && body.learner_feedback ? body.learner_feedback : {},
  };

  try {
    const res = await fetch(`${base}/api/parse_lesson`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return asProxyError(res.status, "module1 parse_lesson failed", data);
    }
    return NextResponse.json(data ?? {});
  } catch (error) {
    return asProxyError(502, "module1 backend unreachable", error instanceof Error ? error.message : String(error));
  }
}
