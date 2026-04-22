import { NextResponse } from "next/server";
import { asProxyError, ensureAuthed, parseJsonSafe, resolveModule1ApiBase } from "../_shared";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await ensureAuthed();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const cacheKey = url.searchParams.get("cache_key");
  if (!cacheKey) {
    return asProxyError(400, "cache_key is required");
  }

  const base = resolveModule1ApiBase();
  try {
    const res = await fetch(`${base}/api/artifact_preview?cache_key=${encodeURIComponent(cacheKey)}`, {
      method: "GET",
      cache: "no-store",
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return asProxyError(res.status, "module1 artifact_preview failed", data);
    }
    return NextResponse.json(data ?? {});
  } catch (error) {
    return asProxyError(502, "module1 backend unreachable", error instanceof Error ? error.message : String(error));
  }
}
