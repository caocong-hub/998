import { NextResponse } from "next/server";
import { asProxyError, ensureAuthed, parseJsonSafe, resolveModule1ApiBase } from "../_shared";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await ensureAuthed();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return asProxyError(400, "PDF file is required");
  }

  const base = resolveModule1ApiBase();
  const upstreamForm = new FormData();
  upstreamForm.append("file", file, file.name);

  try {
    const res = await fetch(`${base}/api/parse_pdf`, {
      method: "POST",
      body: upstreamForm,
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      return asProxyError(res.status, "module1 parse_pdf failed", data);
    }
    return NextResponse.json(data ?? {});
  } catch (error) {
    return asProxyError(502, "module1 backend unreachable", error instanceof Error ? error.message : String(error));
  }
}
