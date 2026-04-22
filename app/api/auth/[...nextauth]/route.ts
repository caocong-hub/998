import { GET as baseGET, POST as basePOST } from "@/auth";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // #region agent log
  fetch("http://127.0.0.1:7885/ingest/e2ae3a21-ff15-4e12-90f1-78f203e315e8", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "dadf4d" },
    body: JSON.stringify({
      sessionId: "dadf4d",
      runId: "m3-runtime-debug-v2",
      hypothesisId: "H6",
      location: "app/api/auth/[...nextauth]/route.ts:6",
      message: "auth-route-get-invoked",
      data: { method: request.method, pathname: new URL(request.url).pathname },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  return baseGET(request);
}

export async function POST(request: NextRequest) {
  // #region agent log
  fetch("http://127.0.0.1:7885/ingest/e2ae3a21-ff15-4e12-90f1-78f203e315e8", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "dadf4d" },
    body: JSON.stringify({
      sessionId: "dadf4d",
      runId: "m3-runtime-debug-v2",
      hypothesisId: "H6",
      location: "app/api/auth/[...nextauth]/route.ts:24",
      message: "auth-route-post-invoked",
      data: { method: request.method, pathname: new URL(request.url).pathname },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  return basePOST(request);
}
