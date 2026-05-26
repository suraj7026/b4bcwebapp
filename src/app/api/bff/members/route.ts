import { NextResponse } from "next/server";
import { api, ApiError } from "@/lib/api/server";
import type { MemberListParams } from "@/lib/api/types";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const params: MemberListParams = {};
  const q = sp.get("q");
  const industryId = sp.get("industryId");
  const zone = sp.get("zone");
  const sort = sp.get("sort");
  const cursor = sp.get("cursor");
  const limit = sp.get("limit");
  if (q) params.q = q;
  if (industryId) params.industryId = industryId;
  if (zone) params.zone = zone;
  if (sort === "name" || sort === "-name" || sort === "recent")
    params.sort = sort;
  if (cursor) params.cursor = cursor;
  if (limit) params.limit = Number(limit) || undefined;
  try {
    return NextResponse.json(await api.members(params));
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(err.body, { status: err.status });
    }
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
