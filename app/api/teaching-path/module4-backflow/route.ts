import { NextResponse } from "next/server";
import { asProxyError, ensureAuthed, parseJsonSafe, resolveModule1ApiBase } from "../_shared";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await ensureAuthed();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return asProxyError(400, "Invalid module4_backflow body");
  }

  const base = resolveModule1ApiBase();
  try {
    const res = await fetch(`${base}/api/module4_backflow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return asProxyError(res.status, "module1 module4_backflow failed", data);
    }
    return NextResponse.json(data ?? {});
  } catch (error) {
    return asProxyError(502, "module1 backend unreachable", error instanceof Error ? error.message : String(error));
  }
}
