import { NextResponse } from "next/server";
import { asProxyError, ensureAuthed, parseJsonSafe, resolveModule1ApiBase } from "../_shared";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await ensureAuthed();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const base = resolveModule1ApiBase();
  try {
    const res = await fetch(`${base}/api/health`, { method: "GET", cache: "no-store" });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return asProxyError(res.status, "module1 health request failed", data);
    }
    return NextResponse.json(data ?? {});
  } catch (error) {
    return asProxyError(502, "module1 backend unreachable", error instanceof Error ? error.message : String(error));
  }
}
