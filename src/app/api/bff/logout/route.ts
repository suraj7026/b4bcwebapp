import { NextResponse } from "next/server";
import { api } from "@/lib/api/server";

export async function POST() {
  await api.logout();
  return new NextResponse(null, { status: 204 });
}
