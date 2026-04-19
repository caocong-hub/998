import { NextRequest, NextResponse } from "next/server";

import { currentUser } from "@/lib/auth";

const base = process.env.M4_API_URL?.replace(/\/$/, "");

async function proxy(req: NextRequest, pathSegments: string[]) {
  const user = await currentUser();
  if (!user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!base) {
    return NextResponse.json(
      {
        error:
          "M4_API_URL is not configured. Start the M4 FastAPI server (see m4/README.md) and set M4_API_URL in .env.",
      },
      { status: 503 }
    );
  }

  const path = pathSegments.join("/");
  const url = new URL(`${base}/${path}`);
  url.search = req.nextUrl.search;

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const init: RequestInit = {
    method: req.method,
    headers,
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  const res = await fetch(url.toString(), init);
  const body = await res.arrayBuffer();
  const out = new NextResponse(body, { status: res.status });
  const ct = res.headers.get("content-type");
  if (ct) {
    out.headers.set("content-type", ct);
  }
  return out;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxy(req, params.path);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxy(req, params.path);
}
