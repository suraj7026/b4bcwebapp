import { NextResponse } from "next/server";
import { z } from "zod";
import { api, ApiError } from "@/lib/api/server";

const Body = z.object({
  reason: z.string().min(1).max(80),
  note: z.string().max(2000).optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    await api.reportMember(id, parsed.data);
    return new NextResponse(null, { status: 202 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(err.body, { status: err.status });
    }
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
