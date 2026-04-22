import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import authConfig from "@/auth.config";
import {
  DEFAULT_LOGIN_REDIRECT,
  apiAuthPrefix,
  authRoutes,
  publicRoutes,
} from "@/routes";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // #region agent log
  fetch("http://127.0.0.1:7885/ingest/e2ae3a21-ff15-4e12-90f1-78f203e315e8", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "dadf4d" },
    body: JSON.stringify({
      sessionId: "dadf4d",
      runId: "m3-runtime-debug",
      hypothesisId: "H3",
      location: "middleware.ts:17",
      message: "middleware-entry",
      data: {
        pathname: nextUrl.pathname,
        isLoggedIn,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);

  if (isApiAuthRoute) {
    return;
  }

  if (isAuthRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl))
    }
    return;
  }

  if (!isLoggedIn && !isPublicRoute) {
    if (nextUrl.pathname.startsWith("/api/") && !isApiAuthRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let callbackUrl = nextUrl.pathname;
    if (nextUrl.search) {
      callbackUrl += nextUrl.search;
    }

    const encodedCallbackUrl = encodeURIComponent(callbackUrl);

    return Response.redirect(new URL(
      `/auth/login?callbackUrl=${encodedCallbackUrl}`,
      nextUrl
    ));
  }

  return;
})

// Optionally, don't invoke Middleware on some paths
export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}