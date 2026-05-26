import { NextResponse } from "next/server";
import { api, ApiError } from "@/lib/api/server";

export async function GET() {
  try {
    return NextResponse.json(await api.me());
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(err.body, { status: err.status });
    }
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
