import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { currentUser } from "@/lib/auth";

const base = (process.env.M2_API_URL || process.env.M4_API_URL)?.replace(/\/$/, "");

function debugLog(hypothesisId: string, location: string, message: string, data: Record<string, unknown>) {
  fetch("http://127.0.0.1:7885/ingest/e2ae3a21-ff15-4e12-90f1-78f203e315e8", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "dadf4d",
    },
    body: JSON.stringify({
      sessionId: "dadf4d",
      runId: "m2-health-pre",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}

async function proxy(req: NextRequest, pathSegments: string[]) {
  // #region agent log
  debugLog("H1", "app/api/m2/[...path]/route.ts:28", "proxy-entry", {
    method: req.method,
    path: pathSegments.join("/"),
    hasBase: Boolean(base),
    search: req.nextUrl.search,
  });
  // #endregion

  const user = await currentUser();
  if (!user?.id) {
    // #region agent log
    debugLog("H2", "app/api/m2/[...path]/route.ts:39", "unauthorized-user", {
      hasUser: Boolean(user),
      hasUserId: Boolean(user?.id),
    });
    // #endregion
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!base) {
    // #region agent log
    debugLog("H1", "app/api/m2/[...path]/route.ts:48", "missing-m2-api-url", {
      hasBase: Boolean(base),
    });
    // #endregion
    return NextResponse.json(
      {
        error:
          "M2_API_URL is not configured. Start the M2 FastAPI server (see m2/README.md) and set M2_API_URL in .env (legacy M4_API_URL is still accepted).",
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

  // #region agent log
  debugLog("H3", "app/api/m2/[...path]/route.ts:75", "upstream-request", {
    url: url.toString(),
    method: req.method,
    hasContentTypeHeader: Boolean(contentType),
  });
  // #endregion

  try {
    const res = await fetch(url.toString(), init);
    const body = await res.arrayBuffer();
    const out = new NextResponse(body, { status: res.status });
    const ct = res.headers.get("content-type");
    if (ct) {
      out.headers.set("content-type", ct);
    }
    // #region agent log
    debugLog("H4", "app/api/m2/[...path]/route.ts:89", "upstream-response", {
      status: res.status,
      contentType: ct ?? null,
    });
    // #endregion
    return out;
  } catch (error) {
    // #region agent log
    debugLog("H3", "app/api/m2/[...path]/route.ts:97", "upstream-fetch-error", {
      error: error instanceof Error ? error.message : String(error),
      url: url.toString(),
    });
    // #endregion
    return NextResponse.json(
      {
        error: "M2 upstream request failed",
        detail: error instanceof Error ? error.message : String(error),
        upstream: url.toString(),
      },
      { status: 502 }
    );
  }
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
