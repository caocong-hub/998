import { NextResponse } from "next/server";

const DEFAULT_MODULE1_API_URL = "http://127.0.0.1:8001";

export function resolveModule1ApiBase() {
  return (process.env.MODULE1_API_URL || DEFAULT_MODULE1_API_URL).replace(/\/$/, "");
}

export async function ensureAuthed() {
  const { currentUser } = await import("@/lib/auth");
  const user = await currentUser();
  if (!user?.id) return null;
  return user;
}

export function asProxyError(status: number, message: string, detail?: unknown) {
  return NextResponse.json(
    {
      error: message,
      detail: detail ?? null,
    },
    { status }
  );
}

export async function parseJsonSafe(res: Response) {
  return res.json().catch(() => null);
}
