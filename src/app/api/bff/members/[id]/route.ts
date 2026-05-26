import { NextResponse } from "next/server";
import { api, ApiError } from "@/lib/api/server";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  try {
    return NextResponse.json(await api.member(id));
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(err.body, { status: err.status });
    }
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
