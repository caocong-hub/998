import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { currentUser } from "@/lib/auth";
import { runModule4Pipeline } from "@/lib/personalized-generator/module4-pipeline";
import { buildModule4Input, fullModule4InputSchema, normalizeModule4Result } from "../shared";

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const json = await req.json().catch(() => null);
    const parsed = fullModule4InputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = buildModule4Input(user.id, parsed.data);
    const result = await runModule4Pipeline(input);
    return NextResponse.json(normalizeModule4Result(result));
  } catch (error) {
    console.error("[PERSONALIZED_GENERATOR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
